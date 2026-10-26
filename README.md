# Monetra — Personal Finance Dashboard

A small personal finance app built with Java's built-in HTTP server, JDBC, HTML/CSS, and plain JavaScript. It tracks transactions and budgets, shows monthly charts, and calculates a few savings projections.

## Features

- Dashboard with income, expenses, net balance, and savings rate
- Add and delete transactions
- Cash-flow chart and expense breakdown by category
- Monthly category budgets with progress
- Insights: average expense, largest category, budget health, and monthly trends
- Spending breakdown with suggested 10% reductions
- Savings simulator and savings goals

## Technology

- Java 21
- SQLite by default; MySQL optional
- HTML, CSS, JavaScript
- Chart.js (CDN)

## Project structure

```text
Monetra/
├── src/MonetraServer.java
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/
│       ├── app.js
│       └── spending.js
├── lib/
│   ├── sqlite-jdbc-3.53.4.0/
│   └── mysql-connector-j-26.7.0/
├── START-MacOS.command
├── START-Linux.sh
├── START-Windows.bat
├── Dockerfile
├── .gitattributes
├── .gitignore
└── README.md
```

## Open it

Double-click the launcher for your system. It compiles the server if needed, starts it, and opens http://localhost:8080 in your browser.

| System | File |
| --- | --- |
| macOS | `START-MacOS.command` |
| Windows | `START-Windows.bat` |
| Linux | `START-Linux.sh` |

Keep the terminal window open while the app is running — closing it stops the server. If Monetra is already running, the launcher just opens the browser.

Each launcher is standalone, so you can rename it to anything you like without breaking it (keep the file extension: `.command` on macOS, `.bat` on Windows, `.sh` on Linux).

On Linux you may need to mark the script executable once: `chmod +x START-Linux.sh`, then run `./START-Linux.sh`.

Java 21 or newer is required. The launchers look for a JDK; if only a JRE is installed and the project has not been compiled yet, they will tell you to install one.

## Run manually

```bash
javac --add-modules jdk.httpserver -d out src/MonetraServer.java
java --add-modules jdk.httpserver \
  -cp "out:lib/sqlite-jdbc-3.53.4.0/sqlite-jdbc-3.53.4.0.jar" \
  MonetraServer
```

Open http://localhost:8080. The app creates `monetra.db` next to the project and the `transactions`, `budgets`, and `savings_goals` tables on first start. On Windows, use `;` instead of `:` in the classpath.

To use MySQL instead, include the MySQL driver and set the environment variables:

```bash
export DB_URL="jdbc:mysql://localhost:3306/monetra"
export DB_USER="root"
export DB_PASSWORD="your-password"

java --add-modules jdk.httpserver \
  -cp "out:lib/sqlite-jdbc-3.53.4.0/sqlite-jdbc-3.53.4.0.jar:lib/mysql-connector-j-26.7.0/mysql-connector-j-26.7.0.jar" \
  MonetraServer
```

The MySQL database itself must exist (`CREATE DATABASE monetra;`); the tables are created automatically.

## Deployment

The included Dockerfile runs the SQLite version. On Railway or any host with an ephemeral filesystem, mount a persistent volume for `/app/monetra.db` or the data resets on redeploy. For multiple users or a managed database, set `DB_URL` to MySQL and configure `DB_USER` / `DB_PASSWORD`.

## Scope

This is an educational project. It has no login or per-user authorization, so everyone who can reach the site shares the same data. Do not store real financial data in a public deployment until accounts, `user_id` scoping, HTTPS, and production error handling are in place.
