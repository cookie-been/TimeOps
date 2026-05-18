package com.timeops.platform.ssh;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
        "timeops.ssh.mode=real",
        "spring.task.scheduling.enabled=false"
})
class SshConfigurationTest {

    @Autowired
    private SshClient sshClient;

    @Test
    void shouldUseRealClientWhenRealModeEnabled() {
        assertThat(sshClient).isInstanceOf(RealSshClient.class);
    }
}

@SpringBootTest(properties = "spring.task.scheduling.enabled=false")
class SimulatedSshConfigurationTest {

    @Autowired
    private SshClient sshClient;

    @Test
    void shouldUseSimulatedClientByDefault() {
        assertThat(sshClient).isInstanceOf(SimulatedSshClient.class);
    }
}
