FROM eclipse-temurin:21-jdk
WORKDIR /app
COPY . /app
RUN javac --add-modules jdk.httpserver -cp ".:lib/mysql-connector-j.jar" src/MonetraServer.java
EXPOSE 8080
CMD ["java", "--add-modules", "jdk.httpserver", "-cp", "src:lib/mysql-connector-j.jar", "MonetraServer"]
