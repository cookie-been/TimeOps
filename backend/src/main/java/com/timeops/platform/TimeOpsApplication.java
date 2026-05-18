package com.timeops.platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class TimeOpsApplication {

    public static void main(String[] args) {
        SpringApplication.run(TimeOpsApplication.class, args);
    }
}
