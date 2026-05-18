package com.timeops.platform.task;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.timeops.platform.customer.CustomerEntity;
import com.timeops.platform.customer.repository.CustomerRepository;
import com.timeops.platform.instance.DeploymentInstanceEntity;
import com.timeops.platform.instance.DeploymentInstanceStatus;
import com.timeops.platform.instance.repository.DeploymentInstanceRepository;
import com.timeops.platform.release.ReleaseEntity;
import com.timeops.platform.release.ReleaseSourceType;
import com.timeops.platform.release.repository.ReleaseRepository;
import com.timeops.platform.server.ConnectivityStatus;
import com.timeops.platform.server.CredentialCryptoService;
import com.timeops.platform.server.ServerEntity;
import com.timeops.platform.server.repository.ServerRepository;
import com.timeops.platform.ssh.SshClient;
import com.timeops.platform.ssh.SshExecutionException;
import com.timeops.platform.ssh.SshExecutionResult;
import com.timeops.platform.ssh.SshTarget;
import com.timeops.platform.template.ProductTemplateEntity;
import com.timeops.platform.template.TemplateActionEntity;
import com.timeops.platform.template.TemplateActionMode;
import com.timeops.platform.template.TemplateActionType;
import com.timeops.platform.template.repository.ProductTemplateRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

@SpringBootTest(properties = "spring.task.scheduling.enabled=false")
class OperationTaskServiceTest {

    @Autowired
    private OperationTaskService operationTaskService;

    @Autowired
    private OperationTaskRepository operationTaskRepository;

    @Autowired
    private CustomerRepository customerRepository;

    @Autowired
    private ServerRepository serverRepository;

    @Autowired
    private CredentialCryptoService credentialCryptoService;

    @Autowired
    private ProductTemplateRepository productTemplateRepository;

    @Autowired
    private ReleaseRepository releaseRepository;

    @Autowired
    private DeploymentInstanceRepository deploymentInstanceRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private ConfigurableSshClient configurableSshClient;

    @BeforeEach
    void setUp() {
        configurableSshClient.reset();
    }

    @Test
    void shouldMoveTaskFromPendingToSuccess() {
        OperationTaskEntity operationTaskEntity = operationTaskService.enqueueAdhoc(
                existingServerId(),
                "echo ok",
                TestDataConstants.ADMIN_USER_ID);
        operationTaskService.execute(operationTaskEntity.getId());

        OperationTaskEntity executedTask = operationTaskRepository.findById(operationTaskEntity.getId()).orElseThrow();
        assertThat(executedTask.getStatus()).isEqualTo(TaskStatus.SUCCESS);
        assertThat(executedTask.getExitCode()).isZero();
        assertThat(executedTask.getStartedAt()).isNotNull();
        assertThat(executedTask.getEndedAt()).isNotNull();
        assertThat(executedTask.getOutputLog()).contains("echo ok");
    }

    @Test
    void shouldMarkTaskFailedWhenSshExecutionThrows() {
        OperationTaskEntity operationTaskEntity = operationTaskService.enqueueAdhoc(
                existingServerId(),
                "echo fail",
                TestDataConstants.ADMIN_USER_ID);

        configurableSshClient.failWith(new IllegalStateException("connect timeout"));

        operationTaskService.execute(operationTaskEntity.getId());

        OperationTaskEntity executedTask = operationTaskRepository.findById(operationTaskEntity.getId()).orElseThrow();
        assertThat(executedTask.getStatus()).isEqualTo(TaskStatus.FAILED);
        assertThat(executedTask.getErrorLog()).contains("connect timeout");
    }

    @Test
    void shouldMarkTaskFailedWhenSshReturnsNonZeroExitCode() {
        OperationTaskEntity operationTaskEntity = operationTaskService.enqueueAdhoc(
                existingServerId(),
                "exit 2",
                TestDataConstants.ADMIN_USER_ID);

        configurableSshClient.returnResult(new SshExecutionResult(2, "", "boom"));

        operationTaskService.execute(operationTaskEntity.getId());

        OperationTaskEntity executedTask = operationTaskRepository.findById(operationTaskEntity.getId()).orElseThrow();
        assertThat(executedTask.getStatus()).isEqualTo(TaskStatus.FAILED);
        assertThat(executedTask.getExitCode()).isEqualTo(2);
        assertThat(executedTask.getErrorLog()).contains("boom");
    }

    @Test
    void shouldPreserveDetailedLogsWhenSshExecutionFailsWithCapturedOutput() {
        OperationTaskEntity operationTaskEntity = operationTaskService.enqueueAdhoc(
                existingServerId(),
                "./ops.sh deploy",
                TestDataConstants.ADMIN_USER_ID);

        configurableSshClient.failWith(new SshExecutionException(
                "command timed out after 30000 ms",
                124,
                "step 4/7 starting\n",
                "curl health check pending\n"));

        operationTaskService.execute(operationTaskEntity.getId());

        OperationTaskEntity executedTask = operationTaskRepository.findById(operationTaskEntity.getId()).orElseThrow();
        assertThat(executedTask.getStatus()).isEqualTo(TaskStatus.FAILED);
        assertThat(executedTask.getExitCode()).isEqualTo(124);
        assertThat(executedTask.getStartedAt()).isNotNull();
        assertThat(executedTask.getEndedAt()).isNotNull();
        assertThat(executedTask.getOutputLog()).contains("step 4/7 starting");
        assertThat(executedTask.getErrorLog()).contains("command timed out after 30000 ms");
        assertThat(executedTask.getErrorLog()).contains("curl health check pending");
    }

    @Test
    void shouldGenerateDistinctTestHostsForDifferentSuffixes() {
        assertThat(buildTestHost("0000000n"))
                .isNotEqualTo(buildTestHost("00000020"));
    }

    @Test
    void shouldExecuteStepActionWithRuntimeContext() {
        StepExecutionFixture fixture = createStepExecutionFixture();

        OperationTaskEntity operationTaskEntity = operationTaskService.enqueueUpdate(
                fixture.instanceId(),
                fixture.releaseId(),
                TestDataConstants.ADMIN_USER_ID);

        operationTaskService.execute(operationTaskEntity.getId());

        assertThat(configurableSshClient.lastCommand())
                .contains("cd /srv/timeops/supply-admin")
                .contains("APP_PORT=9090")
                .contains("DOMAIN=prod.example.com")
                .contains("RELEASE_VERSION=v2.2.0")
                .contains("RELEASE_GIT_REF=refs/tags/v2.2.0")
                .contains("INSTANCE_ENV=prod")
                .contains("./ops/update.sh");
    }

    private UUID existingServerId() {
        String token = UUID.randomUUID().toString();
        String suffix = token.substring(0, 8);
        CustomerEntity customerEntity = customerRepository.save(new CustomerEntity(
                "任务客户-" + suffix,
                "王五",
                "13700000000",
                "wangwu@example.com",
                "任务测试客户"));
        ServerEntity serverEntity = serverRepository.save(new ServerEntity(
                customerEntity.getId(),
                buildTestHost(token),
                22,
                "root",
                credentialCryptoService.encrypt("Task@12345"),
                "Ubuntu 22.04",
                List.of("task"),
                ConnectivityStatus.UNKNOWN,
                "任务主机"));
        return serverEntity.getId();
    }

    private String buildTestHost(String suffix) {
        return "task-host-" + suffix.toLowerCase() + ".internal";
    }

    private StepExecutionFixture createStepExecutionFixture() {
        String token = UUID.randomUUID().toString();
        String suffix = token.substring(0, 8);
        CustomerEntity customerEntity = customerRepository.save(new CustomerEntity(
                "STEP客户-" + suffix,
                "李四",
                "13800000000",
                "lisi@example.com",
                "STEP测试客户"));
        ServerEntity serverEntity = serverRepository.save(new ServerEntity(
                customerEntity.getId(),
                buildTestHost("step-" + token),
                22,
                "deploy",
                credentialCryptoService.encrypt("Step@12345"),
                "Ubuntu 22.04",
                List.of("step"),
                ConnectivityStatus.UNKNOWN,
                "STEP主机"));

        ObjectNode defaultConfig = objectMapper.createObjectNode();
        defaultConfig.put("APP_PORT", "8080");
        defaultConfig.put("JAVA_OPTS", "-Xms512m");

        ObjectNode stepDefinition = objectMapper.createObjectNode();
        stepDefinition.put("script", "./ops/update.sh");
        stepDefinition.put("useReleaseGitRef", true);
        stepDefinition.put("useReleaseVersion", true);
        stepDefinition.put("useInstanceEnvironment", true);
        stepDefinition.put("useMergedConfigEnv", true);

        ProductTemplateEntity productTemplateEntity = new ProductTemplateEntity(
                "供应链后台-" + suffix,
                "supply-admin-" + suffix,
                List.of("GIT"),
                "/srv/timeops/supply-admin",
                defaultConfig,
                "STEP模板");
        productTemplateEntity.replaceActions(List.of(new TemplateActionEntity(
                TemplateActionType.UPDATE,
                TemplateActionMode.STEP,
                null,
                stepDefinition)));
        ProductTemplateEntity savedTemplate = productTemplateRepository.save(productTemplateEntity);

        ReleaseEntity releaseEntity = releaseRepository.save(new ReleaseEntity(
                savedTemplate,
                "v2.2.0",
                ReleaseSourceType.GIT,
                "https://example.com/supply-admin.git",
                "refs/tags/v2.2.0",
                null,
                "step release",
                TestDataConstants.ADMIN_USER_ID));

        ObjectNode configOverride = objectMapper.createObjectNode();
        configOverride.put("APP_PORT", "9090");
        configOverride.put("DOMAIN", "prod.example.com");

        DeploymentInstanceEntity deploymentInstanceEntity = deploymentInstanceRepository.save(new DeploymentInstanceEntity(
                customerEntity.getId(),
                savedTemplate.getId(),
                serverEntity.getId(),
                "供应链生产-" + suffix,
                "prod",
                releaseEntity.getId(),
                DeploymentInstanceStatus.RUNNING,
                configOverride,
                "STEP实例"));

        return new StepExecutionFixture(deploymentInstanceEntity.getId(), releaseEntity.getId());
    }

    private record StepExecutionFixture(UUID instanceId, UUID releaseId) {
    }

    @TestConfiguration
    static class TestSshConfig {

        @Bean
        @Primary
        ConfigurableSshClient configurableSshClient() {
            return new ConfigurableSshClient();
        }
    }

    static class ConfigurableSshClient implements SshClient {

        private RuntimeException runtimeException;
        private SshExecutionResult nextResult;
        private String lastCommand;

        void reset() {
            runtimeException = null;
            nextResult = null;
            lastCommand = null;
        }

        void failWith(RuntimeException runtimeException) {
            this.runtimeException = runtimeException;
            this.nextResult = null;
        }

        void returnResult(SshExecutionResult sshExecutionResult) {
            this.runtimeException = null;
            this.nextResult = sshExecutionResult;
        }

        String lastCommand() {
            return lastCommand;
        }

        @Override
        public SshExecutionResult execute(SshTarget sshTarget, String command) {
            lastCommand = command;
            if (runtimeException != null) {
                throw runtimeException;
            }
            if (nextResult != null) {
                return nextResult;
            }
            return new SshExecutionResult(0, "executed -> " + command, "");
        }
    }
}
