package com.lexora.config;

import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.web.client.RestTemplate;

/**
 * HTTP client for Groq / Ollama. Uses Apache HttpComponents instead of JDK {@link java.net.HttpURLConnection}
 * — Groq sits behind Cloudflare and often returns 403 / error 1010 for the default Java stack.
 *
 * <p>Cookies are disabled: Groq uses Bearer auth only, but Cloudflare may send {@code Set-Cookie} headers
 * whose {@code Expires} format trips HttpClient's strict cookie parser — harmless WARN spam in logs otherwise.
 */
@Configuration
public class RestTemplateConfig {

    @Bean
    public RestTemplate restTemplate() {
        CloseableHttpClient httpClient = HttpClients.custom().disableCookieManagement().build();
        HttpComponentsClientHttpRequestFactory f = new HttpComponentsClientHttpRequestFactory(httpClient);
        f.setConnectTimeout(15_000);
        f.setReadTimeout(120_000);
        return new RestTemplate(f);
    }
}
