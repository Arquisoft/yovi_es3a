package dede;

import java.time.Duration;
import java.util.*;

import io.gatling.javaapi.core.*;
import io.gatling.javaapi.http.*;
import io.gatling.javaapi.jdbc.*;

import static io.gatling.javaapi.core.CoreDsl.*;
import static io.gatling.javaapi.http.HttpDsl.*;
import static io.gatling.javaapi.jdbc.JdbcDsl.*;

public class userList1 extends Simulation {

    private HttpProtocolBuilder httpProtocol = http
            .baseUrl("http://158.179.212.71:3000")
            .inferHtmlResources(AllowList(),
                    DenyList(".*\\.js", ".*\\.css", ".*\\.gif", ".*\\.jpeg", ".*\\.jpg", ".*\\.ico", ".*\\.woff",
                            ".*\\.woff2",
                            ".*\\.(t|o)tf", ".*\\.png", ".*\\.svg", ".*detectportal\\.firefox\\.com.*"))
            .acceptHeader("*/*")
            .acceptEncodingHeader("gzip, deflate")
            .acceptLanguageHeader("es-ES,es;q=0.9,en-US;q=0.8,en;q=0.7")
            .originHeader("http://158.179.212.71")
            .userAgentHeader("Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:149.0) Gecko/20100101 Firefox/149.0");

    private Map<CharSequence, String> headers_0 = Map.ofEntries(
            Map.entry("Access-Control-Request-Headers", "content-type"),
            Map.entry("Access-Control-Request-Method", "POST"),
            Map.entry("Priority", "u=4"));

    private Map<CharSequence, String> headers_1 = Map.ofEntries(
            Map.entry("Content-Type", "application/json"),
            Map.entry("Priority", "u=0"));

    private ScenarioBuilder scn = scenario("userList1")
            .exec(
                    http("Login")
                            .post("/login")
                            .headers(headers_1)
                            .body(RawFileBody("dede/userlist1/0001_request.json"))
                            .check(status().in(200, 401)) // 200 ok, 401 credenciales malas
            )
            .pause(9)
            .exec(
                    http("Register")
                            .post("/createuser")
                            .headers(headers_1)
                            .body(RawFileBody("dede/userlist1/0003_request.json"))
                            .check(status().in(201, 400)) // 201 creado, 400 ya existe
            );

    {
        setUp(scn.injectOpen(atOnceUsers(10))).protocols(httpProtocol);
    }
}
