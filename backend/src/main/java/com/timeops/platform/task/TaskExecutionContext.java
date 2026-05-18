package com.timeops.platform.task;

import com.fasterxml.jackson.databind.node.ObjectNode;
import com.timeops.platform.instance.DeploymentInstanceEntity;
import com.timeops.platform.release.ReleaseEntity;
import com.timeops.platform.ssh.SshTarget;
import com.timeops.platform.template.ProductTemplateEntity;
import com.timeops.platform.template.TemplateActionEntity;

public record TaskExecutionContext(
        OperationTaskEntity task,
        SshTarget sshTarget,
        TemplateActionEntity templateAction,
        ProductTemplateEntity template,
        DeploymentInstanceEntity instance,
        ReleaseEntity release,
        ObjectNode mergedConfig,
        String workDir) {
}
