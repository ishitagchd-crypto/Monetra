# Monetra — Personal Finance Management & Analytics

**Make every rupee count.**

Monetra is a responsive personal finance website built with **Core Java**, Java's built-in HTTP server, JDBC, MySQL, HTML, CSS and JavaScript. It uses a premium, calm interface designed around clarity and approachable financial insights.

## Features

- Finance dashboard with income, expenses, net balance and savings rate
- Add and delete transactions
- Category spending breakdown and cash-flow charts
- Monthly category budgets and progress indicators
- Financial insights and a future savings projection
- Responsive desktop and mobile layout
- Preview mode in the frontend when the Java API is unavailable

## Technology

- Java 21
- MySQL Community Server
- MySQL Connector/J
- HTML, CSS, JavaScript
- Chart.js (CDN)

## Project structure

```text
Monetra/
├── src/
│   └── MonetraServer.java
├── public/
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
├── lib/
│   └── mysql-connector-j.jar
├── Dockerfile
├── .gitignore
└── README.md
```

## Local setup (Windows + VS Code)

1. Install JDK 21 and MySQL Server.
2. Create the database in MySQL Workbench:

   ```sql
   CREATE DATABASE monetra;
   ```

3. Download MySQL Connector/J from https://dev.mysql.com/downloads/connector/j/
4. Put the downloaded JAR in `lib/` and rename it to `mysql-connector-j.jar`.
5. In the VS Code terminal at the project root, set your database settings:

   ```powershell
   $env:DB_URL="jdbc:mysql://localhost:3306/monetra"
   $env:DB_USER="root"
   $env:DB_PASSWORD="YOUR_LOCAL_MYSQL_PASSWORD"
   ```

6. Compile and run:

   ```powershell
   javac --add-modules jdk.httpserver -cp "lib\mysql-connector-j.jar" src\MonetraServer.java
   java --add-modules jdk.httpserver -cp "src;lib\mysql-connector-j.jar" MonetraServer
   ```

7. Open http://localhost:8080

The app creates the `transactions` and `budgets` tables automatically. Never commit passwords or `.env` files to GitHub.

## GitHub

Create a public repository named `monetra-personal-finance`. From the project root:

```powershell
git init
git add .
git commit -m "Build Monetra finance dashboard"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/monetra-personal-finance.git
git push -u origin main
```

Replace `YOUR-USERNAME` with your GitHub username. Keep the MySQL JDBC JAR out of GitHub if your repository policy disallows binary files; place it in the build environment or add it as a deployment build dependency.

## Deployment with Railway

1. Push the project to GitHub.
2. Create a Railway project and add a MySQL service.
3. Add a Java app service from the GitHub repository or deploy using the included Dockerfile.
4. Ensure the MySQL JDBC driver is available at `lib/mysql-connector-j.jar` during the image build. The current Dockerfile expects this file to exist; update the build to fetch the official driver or provide it through a secure build process.
5. Configure these variables in the Java service using the values from your Railway MySQL service:

   - `PORT` (Railway provides this)
   - `DB_URL` (JDBC URL for the provisioned MySQL service)
   - `DB_USER`
   - `DB_PASSWORD`

   The `DB_URL` must use the JDBC format, for example `jdbc:mysql://HOST:PORT/monetra`, with the host and port supplied by your database provider.

6. Generate a public domain in Railway and test the deployed website.

## Security and project scope

This is an educational project starter, not a production-ready financial service. It currently has no login/authentication or per-user authorization. Do not deploy it with real personal or financial data until authentication, access control, HTTPS, request protection and production-grade error handling have been implemented and tested. Use fictional sample data for public demonstrations.
