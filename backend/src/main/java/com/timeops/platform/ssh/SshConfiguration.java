package com.timeops.platform.ssh;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(SshProperties.class)
public class SshConfiguration {

    @Bean
    public SshClient sshClient(SshProperties sshProperties) {
        if (sshProperties.getMode() == SshMode.REAL) {
            return new RealSshClient(sshProperties);
        }
        return new SimulatedSshClient();
    }
}
