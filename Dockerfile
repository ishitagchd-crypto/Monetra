FROM eclipse-temurin:21-jdk
WORKDIR /app
COPY . /app
RUN javac --add-modules jdk.httpserver -d out src/MonetraServer.java
EXPOSE 8080
CMD ["java", "--add-modules", "jdk.httpserver", "-cp", "out:lib/sqlite-jdbc-3.53.4.0/sqlite-jdbc-3.53.4.0.jar:lib/mysql-connector-j-26.7.0/mysql-connector-j-26.7.0.jar", "MonetraServer"]
