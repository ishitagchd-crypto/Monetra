import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.time.LocalDate;
import java.util.*;
import java.util.regex.*;

public class MonetraServer {
    private static final String DB_URL = env("DB_URL", "jdbc:mysql://localhost:3306/monetra");
    private static final String DB_USER = env("DB_USER", "root");
    private static final String DB_PASSWORD = System.getenv("DB_PASSWORD") == null
        ? "" : System.getenv("DB_PASSWORD");

    private static String env(String key, String fallback) {
        String value = System.getenv(key);
        return value == null || value.isBlank() ? fallback : value;
    }

    private static Connection connect() throws SQLException {
        return DriverManager.getConnection(DB_URL, DB_USER, DB_PASSWORD);
    }

    private static void initDatabase() throws SQLException {
        try (Connection c = connect(); Statement s = c.createStatement()) {
            s.executeUpdate("""
                CREATE TABLE IF NOT EXISTS transactions (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    type VARCHAR(10) NOT NULL,
                    category VARCHAR(60) NOT NULL,
                    amount DECIMAL(12,2) NOT NULL,
                    description VARCHAR(255),
                    transaction_date DATE NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """);
            s.executeUpdate("""
                CREATE TABLE IF NOT EXISTS budgets (
                    id BIGINT PRIMARY KEY AUTO_INCREMENT,
                    category VARCHAR(60) NOT NULL,
                    monthly_limit DECIMAL(12,2) NOT NULL,
                    month_key CHAR(7) NOT NULL,
                    UNIQUE KEY unique_budget (category, month_key)
                )
            """);
        }
    }

    private static void send(HttpExchange ex, int status, String type, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", type + "; charset=UTF-8");
        ex.getResponseHeaders().set("X-Content-Type-Options", "nosniff");
        ex.getResponseHeaders().set("Cache-Control", "no-store");
        ex.sendResponseHeaders(status, bytes.length);
        try (OutputStream out = ex.getResponseBody()) { out.write(bytes); }
    }

    private static String readBody(HttpExchange ex) throws IOException {
        return new String(ex.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
    }

    private static String jsonString(String json, String key, String fallback) {
        Matcher m = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*\"((?:\\\\.|[^\"\\\\])*)\"").matcher(json);
        if (!m.find()) return fallback;
        return m.group(1).replace("\\n", "\n").replace("\\\"", "\"").replace("\\\\", "\\");
    }

    private static double jsonNumber(String json, String key, double fallback) {
        Matcher m = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*(-?\\d+(?:\\.\\d+)?)").matcher(json);
        if (!m.find()) return fallback;
        try { return Double.parseDouble(m.group(1)); } catch (Exception e) { return fallback; }
    }

    private static String quote(String s) {
        if (s == null) return "null";
        return "\"" + s.replace("\\", "\\\\").replace("\"", "\\\"")
            .replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t") + "\"";
    }

    private static String transactionsJson() throws SQLException {
        StringBuilder out = new StringBuilder("[");
        try (Connection c = connect(); PreparedStatement p = c.prepareStatement(
                "SELECT id,type,category,amount,description,transaction_date FROM transactions ORDER BY transaction_date DESC,id DESC");
             ResultSet r = p.executeQuery()) {
            boolean first = true;
            while (r.next()) {
                if (!first) out.append(",");
                first = false;
                out.append("{\"id\":").append(r.getLong("id"))
                    .append(",\"type\":").append(quote(r.getString("type")))
                    .append(",\"category\":").append(quote(r.getString("category")))
                    .append(",\"amount\":").append(r.getBigDecimal("amount").toPlainString())
                    .append(",\"description\":").append(quote(r.getString("description")))
                    .append(",\"date\":").append(quote(r.getDate("transaction_date").toString()))
                    .append("}");
            }
        }
        return out.append("]").toString();
    }

    private static String budgetsJson() throws SQLException {
        StringBuilder out = new StringBuilder("[");
        try (Connection c = connect(); PreparedStatement p = c.prepareStatement(
                "SELECT id,category,monthly_limit,month_key FROM budgets WHERE month_key=? ORDER BY category")) {
            p.setString(1, LocalDate.now().toString().substring(0, 7));
            try (ResultSet r = p.executeQuery()) {
                boolean first = true;
                while (r.next()) {
                    if (!first) out.append(",");
                    first = false;
                    out.append("{\"id\":").append(r.getLong("id"))
                        .append(",\"category\":").append(quote(r.getString("category")))
                        .append(",\"limit\":").append(r.getBigDecimal("monthly_limit").toPlainString())
                        .append(",\"month\":").append(quote(r.getString("month_key"))).append("}");
                }
            }
        }
        return out.append("]").toString();
    }

    private static void handleApi(HttpExchange ex) throws IOException {
        String path = ex.getRequestURI().getPath();
        String method = ex.getRequestMethod();
        try {
            if (path.equals("/api/health")) {
                try (Connection ignored = connect()) {
                    send(ex, 200, "application/json", "{\"ok\":true,\"database\":\"connected\"}");
                }
                return;
            }
            if (path.equals("/api/transactions") && method.equals("GET")) {
                send(ex, 200, "application/json", transactionsJson());
                return;
            }
            if (path.equals("/api/transactions") && method.equals("POST")) {
                String body = readBody(ex);
                String type = jsonString(body, "type", "").toUpperCase(Locale.ROOT);
                String category = jsonString(body, "category", "").trim();
                String description = jsonString(body, "description", "").trim();
                double amount = jsonNumber(body, "amount", -1);
                String dateText = jsonString(body, "date", "");
                if (!Set.of("INCOME", "EXPENSE").contains(type) || category.isBlank() ||
                    category.length() > 60 || description.length() > 255 ||
                    !Double.isFinite(amount) || amount <= 0 || amount > 9999999999.99) {
                    send(ex, 400, "application/json", "{\"error\":\"Please enter valid transaction details.\"}");
                    return;
                }
                LocalDate date;
                try { date = LocalDate.parse(dateText); }
                catch (Exception e) {
                    send(ex, 400, "application/json", "{\"error\":\"Please select a valid date.\"}");
                    return;
                }
                try (Connection c = connect(); PreparedStatement p = c.prepareStatement(
                    "INSERT INTO transactions(type,category,amount,description,transaction_date) VALUES(?,?,?,?,?)",
                    Statement.RETURN_GENERATED_KEYS)) {
                    p.setString(1, type);
                    p.setString(2, category);
                    p.setBigDecimal(3, java.math.BigDecimal.valueOf(amount));
                    p.setString(4, description);
                   p.setDate(5, java.sql.Date.valueOf(date));
                    p.executeUpdate();
                    try (ResultSet keys = p.getGeneratedKeys()) {
                        long id = keys.next() ? keys.getLong(1) : 0;
                        send(ex, 201, "application/json", "{\"ok\":true,\"id\":" + id + "}");
                    }
                }
                return;
            }
            if (path.matches("/api/transactions/\\d+") && method.equals("DELETE")) {
                long id = Long.parseLong(path.substring(path.lastIndexOf('/') + 1));
                try (Connection c = connect(); PreparedStatement p = c.prepareStatement("DELETE FROM transactions WHERE id=?")) {
                    p.setLong(1, id);
                    int changed = p.executeUpdate();
                    send(ex, changed == 1 ? 200 : 404, "application/json",
                        changed == 1 ? "{\"ok\":true}" : "{\"error\":\"Transaction not found.\"}");
                }
                return;
            }
            if (path.equals("/api/savings-goals") && method.equals("GET")) {
    StringBuilder json = new StringBuilder("[");
    try (Connection c = connect();
         PreparedStatement p = c.prepareStatement(
             "SELECT id, name, target_amount, saved_amount, deadline " +
             "FROM savings_goals ORDER BY deadline ASC");
         ResultSet r = p.executeQuery()) {

        boolean first = true;
        while (r.next()) {
            if (!first) json.append(",");
            first = false;

            json.append("{")
                .append("\"id\":").append(r.getInt("id")).append(",")
                .append("\"name\":\"")
                .append(r.getString("name")
                    .replace("\\", "\\\\").replace("\"", "\\\""))
                .append("\",")
                .append("\"targetAmount\":").append(r.getBigDecimal("target_amount")).append(",")
                .append("\"savedAmount\":").append(r.getBigDecimal("saved_amount")).append(",")
                .append("\"deadline\":\"").append(r.getDate("deadline")).append("\"")
                .append("}");
        }
    } catch (SQLException e) {
        send(ex, 500, "application/json",
             "{\"error\":\"Could not load savings goals\"}");
        return;
    }

    send(ex, 200, "application/json", json.append("]").toString());
    return;
}
if (path.equals("/api/savings-goals") && method.equals("POST")) {
    String body = readBody(ex);
    String name = jsonString(body, "name", "").trim();
    double target = jsonNumber(body, "targetAmount", -1);
    double saved = jsonNumber(body, "savedAmount", 0);
    String deadline = jsonString(body, "deadline", "");

    if (name.isBlank() || name.length() > 100 ||
        !Double.isFinite(target) || target <= 0 ||
        !Double.isFinite(saved) || saved < 0 || saved > target ||
        !deadline.matches("\\d{4}-\\d{2}-\\d{2}")) {
        send(ex, 400, "application/json",
             "{\"error\":\"Enter valid goal details\"}");
        return;
    }

    try {
        java.time.LocalDate.parse(deadline);

        try (Connection c = connect();
             PreparedStatement p = c.prepareStatement(
                 "INSERT INTO savings_goals " +
                 "(name, target_amount, saved_amount, deadline) " +
                 "VALUES (?, ?, ?, ?)")) {
            p.setString(1, name);
            p.setDouble(2, target);
            p.setDouble(3, saved);
            p.setString(4, deadline);
            p.executeUpdate();
        }

        send(ex, 201, "application/json", "{\"ok\":true}");
    } catch (java.time.DateTimeException e) {
        send(ex, 400, "application/json",
             "{\"error\":\"Enter a valid deadline date\"}");
    } catch (SQLException e) {
        send(ex, 500, "application/json",
             "{\"error\":\"Could not save savings goal\"}");
    }

    return;
}
            if (path.equals("/api/budgets") && method.equals("GET")) {
                send(ex, 200, "application/json", budgetsJson());
                return;
            }
            if (path.equals("/api/budgets") && method.equals("POST")) {
                String body = readBody(ex);
                String category = jsonString(body, "category", "").trim();
                double limit = jsonNumber(body, "limit", -1);
                String month = jsonString(body, "month", LocalDate.now().toString().substring(0, 7));
                if (category.isBlank() || category.length() > 60 || !Double.isFinite(limit) || limit <= 0 ||
                    !month.matches("\\d{4}-\\d{2}")) {
                    send(ex, 400, "application/json", "{\"error\":\"Enter a valid category, month and budget.\"}");
                    return;
                }
                try (Connection c = connect(); PreparedStatement p = c.prepareStatement(
                    "INSERT INTO budgets(category,monthly_limit,month_key) VALUES(?,?,?) " +
                    "ON DUPLICATE KEY UPDATE monthly_limit=VALUES(monthly_limit)")) {
                    p.setString(1, category);
                    p.setBigDecimal(2, java.math.BigDecimal.valueOf(limit));
                    p.setString(3, month);
                    p.executeUpdate();
                }
                send(ex, 201, "application/json", "{\"ok\":true}");
                return;
            }
            send(ex, 404, "application/json", "{\"error\":\"API route not found.\"}");
        } catch (SQLException e) {
            e.printStackTrace();
            send(ex, 500, "application/json", "{\"error\":\"Database error. Check your MySQL connection and settings.\"}");
        } catch (Exception e) {
            e.printStackTrace();
            send(ex, 400, "application/json", "{\"error\":\"Request could not be processed.\"}");
        }
    }

    private static String contentType(String path) {
        if (path.endsWith(".css")) return "text/css";
        if (path.endsWith(".js")) return "application/javascript";
        if (path.endsWith(".svg")) return "image/svg+xml";
        if (path.endsWith(".png")) return "image/png";
        if (path.endsWith(".jpg") || path.endsWith(".jpeg")) return "image/jpeg";
        return "text/html";
    }

    private static void handleStatic(HttpExchange ex) throws IOException {
        String uriPath = ex.getRequestURI().getPath();
        if (uriPath.equals("/")) uriPath = "/index.html";
        if (uriPath.contains("..")) { send(ex, 400, "text/plain", "Invalid path"); return; }
        File root = new File("public").getCanonicalFile();
        File file = new File(root, uriPath.substring(1)).getCanonicalFile();
        if (!file.toPath().startsWith(root.toPath()) || !file.isFile()) {
            send(ex, 404, "text/plain", "Not found"); return;
        }
        String body = java.nio.file.Files.readString(file.toPath());
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        ex.getResponseHeaders().set("Content-Type", contentType(file.getName()) + "; charset=UTF-8");
        ex.getResponseHeaders().set("X-Content-Type-Options", "nosniff");
        ex.sendResponseHeaders(200, bytes.length);
        try (OutputStream out = ex.getResponseBody()) { out.write(bytes); }
    }

    public static void main(String[] args) throws Exception {
        Class.forName("com.mysql.cj.jdbc.Driver");
        initDatabase();
        int port = Integer.parseInt(env("PORT", "8080"));
        HttpServer server = HttpServer.create(new InetSocketAddress("0.0.0.0", port), 0);
        server.createContext("/api/", MonetraServer::handleApi);
        server.createContext("/", MonetraServer::handleStatic);
        server.setExecutor(java.util.concurrent.Executors.newFixedThreadPool(8));
        server.start();
        System.out.println("Monetra is running on port " + port);
    }
}
