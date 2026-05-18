package com.timeops.platform.task;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.timeops.platform.release.ReleaseEntity;
import com.timeops.platform.ssh.SshClient;
import com.timeops.platform.ssh.SshExecutionResult;
import com.timeops.platform.template.TemplateActionEntity;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
public class TemplateStepExecutor {

    private final SshClient sshClient;

    public TemplateStepExecutor(SshClient sshClient) {
        this.sshClient = sshClient;
    }

    public SshExecutionResult execute(TaskExecutionContext taskExecutionContext) {
        return sshClient.execute(taskExecutionContext.sshTarget(), buildCommand(taskExecutionContext));
    }

    String buildCommand(TaskExecutionContext taskExecutionContext) {
        TemplateActionEntity templateActionEntity = taskExecutionContext.templateAction();
        if (templateActionEntity == null || templateActionEntity.getStepDefinition() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "stepDefinition must not be null for STEP mode");
        }

        JsonNode stepDefinition = templateActionEntity.getStepDefinition();
        String script = stepDefinition.path("script").asText();
        if (script.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "stepDefinition.script must not be blank");
        }

        List<String> segments = new ArrayList<>();
        if (taskExecutionContext.workDir() != null && !taskExecutionContext.workDir().isBlank()) {
            segments.add("cd " + shellValue(taskExecutionContext.workDir()));
        }

        List<String> envAssignments = buildEnvAssignments(taskExecutionContext, stepDefinition);
        String scriptSegment = envAssignments.isEmpty()
                ? script
                : String.join(" ", envAssignments) + " " + script;
        segments.add(scriptSegment);
        return String.join(" && ", segments);
    }

    private List<String> buildEnvAssignments(TaskExecutionContext taskExecutionContext, JsonNode stepDefinition) {
        List<String> envAssignments = new ArrayList<>();
        if (stepDefinition.path("useMergedConfigEnv").asBoolean(false)) {
            appendJsonEnv(envAssignments, taskExecutionContext.mergedConfig());
        }
        if (stepDefinition.path("useReleaseVersion").asBoolean(false) && taskExecutionContext.release() != null) {
            envAssignments.add("RELEASE_VERSION=" + shellValue(taskExecutionContext.release().getVersionLabel()));
        }
        if (stepDefinition.path("useReleaseGitRef").asBoolean(false)) {
            ReleaseEntity releaseEntity = taskExecutionContext.release();
            if (releaseEntity != null && releaseEntity.getGitRef() != null && !releaseEntity.getGitRef().isBlank()) {
                envAssignments.add("RELEASE_GIT_REF=" + shellValue(releaseEntity.getGitRef()));
            }
        }
        if (stepDefinition.path("useInstanceEnvironment").asBoolean(false)
                && taskExecutionContext.instance() != null
                && taskExecutionContext.instance().getEnvironmentLabel() != null) {
            envAssignments.add("INSTANCE_ENV=" + shellValue(taskExecutionContext.instance().getEnvironmentLabel()));
        }
        return envAssignments;
    }

    private void appendJsonEnv(List<String> envAssignments, ObjectNode objectNode) {
        if (objectNode == null) {
            return;
        }
        Iterator<Map.Entry<String, JsonNode>> fields = objectNode.fields();
        while (fields.hasNext()) {
            Map.Entry<String, JsonNode> field = fields.next();
            if (field.getValue().isNull()) {
                continue;
            }
            envAssignments.add(field.getKey() + "=" + shellValue(field.getValue().asText()));
        }
    }

    private String shellValue(String rawValue) {
        if (rawValue.matches("[A-Za-z0-9_./:@-]+")) {
            return rawValue;
        }
        return "'" + rawValue.replace("'", "'\"'\"'") + "'";
    }
}
