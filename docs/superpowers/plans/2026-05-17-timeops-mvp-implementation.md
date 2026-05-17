# TimeOps MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个面向内部运维团队的 TimeOps MVP，实现客户与服务器管理、产品模板、部署实例、发布版本、异步 SSH 执行、RBAC 和审计日志。

**Architecture:** 采用前后端分离的模块化单体方案。后端使用 Spring Boot 提供 API、权限、任务和审计能力；前端使用 React + Ant Design 提供企业后台界面；任务执行通过后端异步任务队列驱动 SSH 操作。

**Tech Stack:** Java 21, Spring Boot 3, Spring Security, Spring Data JPA, Flyway, PostgreSQL, React, TypeScript, Vite, Ant Design, Vitest, JUnit 5, Testcontainers

---

## 计划前提

- 仓库当前尚未存在现成业务代码，本计划默认从空目录起步搭建 `backend/` 与 `frontend/`
- 平台自身数据库选用 PostgreSQL，原因是 JSONB 更适合保存模板默认配置、实例覆盖配置和部分任务上下文
- 首期远程执行统一通过 SSH 用户名密码
- 首期部署目标统一为 Linux + Docker Compose
- 首期发布来源支持 Git 与上传发布包

## 目标目录结构

### 后端

- `backend/pom.xml`：Maven 构建文件
- `backend/src/main/java/com/timeops/platform/TimeOpsApplication.java`：Spring Boot 启动入口
- `backend/src/main/java/com/timeops/platform/common/`：通用异常、返回体、时间与 JSON 配置
- `backend/src/main/java/com/timeops/platform/security/`：认证、JWT、RBAC、密码编码
- `backend/src/main/java/com/timeops/platform/user/`：用户、角色、权限
- `backend/src/main/java/com/timeops/platform/customer/`：客户
- `backend/src/main/java/com/timeops/platform/server/`：服务器与凭据加密
- `backend/src/main/java/com/timeops/platform/template/`：产品模板与模板动作
- `backend/src/main/java/com/timeops/platform/release/`：发布版本与发布包元数据
- `backend/src/main/java/com/timeops/platform/instance/`：部署实例与实例配置
- `backend/src/main/java/com/timeops/platform/task/`：运维任务、任务队列、执行结果
- `backend/src/main/java/com/timeops/platform/audit/`：审计日志
- `backend/src/main/java/com/timeops/platform/ssh/`：SSH 抽象与执行器
- `backend/src/main/resources/db/migration/`：Flyway 数据库迁移
- `backend/src/test/java/com/timeops/platform/`：后端测试

### 前端

- `frontend/package.json`：前端依赖与脚本
- `frontend/vite.config.ts`：Vite 配置
- `frontend/src/main.tsx`：前端入口
- `frontend/src/app/`：路由、布局、鉴权
- `frontend/src/features/auth/`：登录与身份状态
- `frontend/src/features/customers/`：客户页面
- `frontend/src/features/servers/`：服务器页面
- `frontend/src/features/templates/`：产品模板页面
- `frontend/src/features/releases/`：发布版本页面
- `frontend/src/features/instances/`：部署实例页面
- `frontend/src/features/tasks/`：任务中心页面
- `frontend/src/features/audit/`：审计日志页面
- `frontend/src/features/users/`：用户与角色页面
- `frontend/src/shared/api/`：HTTP 客户端
- `frontend/src/shared/components/`：公共组件
- `frontend/src/test/`：前端测试

## Task 1: 搭建后端骨架与基础健康检查

**Files:**
- Create: `backend/pom.xml`
- Create: `backend/src/main/java/com/timeops/platform/TimeOpsApplication.java`
- Create: `backend/src/main/java/com/timeops/platform/common/api/ApiResponse.java`
- Create: `backend/src/main/java/com/timeops/platform/common/web/HealthController.java`
- Create: `backend/src/main/resources/application.yml`
- Create: `backend/src/test/java/com/timeops/platform/common/web/HealthControllerTest.java`

- [ ] **Step 1: 写一个失败的健康检查测试**

```java
package com.timeops.platform.common.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldReturnHealthPayload() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"));
    }
}
```

- [ ] **Step 2: 运行测试，确认当前工程尚未搭起**

Run: `cd backend && mvn test -Dtest=HealthControllerTest`

Expected:

- `The goal you specified requires a project to execute but there is no POM in this directory`
- 或应用类不存在导致编译失败

- [ ] **Step 3: 写最小可运行后端骨架**

`backend/pom.xml`

```xml
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 http://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.2</version>
    </parent>
    <groupId>com.timeops</groupId>
    <artifactId>timeops-backend</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <properties>
        <java.version>21</java.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
</project>
```

`backend/src/main/java/com/timeops/platform/TimeOpsApplication.java`

```java
package com.timeops.platform;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class TimeOpsApplication {

    public static void main(String[] args) {
        SpringApplication.run(TimeOpsApplication.class, args);
    }
}
```

`backend/src/main/java/com/timeops/platform/common/api/ApiResponse.java`

```java
package com.timeops.platform.common.api;

public record ApiResponse<T>(boolean success, T data) {

    public static <T> ApiResponse<T> ok(T data) {
        return new ApiResponse<>(true, data);
    }
}
```

`backend/src/main/java/com/timeops/platform/common/web/HealthController.java`

```java
package com.timeops.platform.common.web;

import com.timeops.platform.common.api.ApiResponse;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/health")
class HealthController {

    @GetMapping
    ApiResponse<Map<String, String>> health() {
        return ApiResponse.ok(Map.of("status", "UP"));
    }
}
```

`backend/src/main/resources/application.yml`

```yaml
spring:
  application:
    name: timeops-backend
server:
  port: 8080
```

- [ ] **Step 4: 重新运行测试，确认基础后端通过**

Run: `cd backend && mvn test -Dtest=HealthControllerTest`

Expected:

- `BUILD SUCCESS`
- `Tests run: 1, Failures: 0`

- [ ] **Step 5: 提交基础骨架**

```bash
git add backend
git commit -m "feat: scaffold backend application"
```

## Task 2: 建立认证、JWT 与 RBAC 基础

**Files:**
- Modify: `backend/pom.xml`
- Create: `backend/src/main/resources/db/migration/V1__init_security.sql`
- Create: `backend/src/main/java/com/timeops/platform/security/SecurityConfig.java`
- Create: `backend/src/main/java/com/timeops/platform/security/JwtService.java`
- Create: `backend/src/main/java/com/timeops/platform/security/JwtAuthenticationFilter.java`
- Create: `backend/src/main/java/com/timeops/platform/user/UserEntity.java`
- Create: `backend/src/main/java/com/timeops/platform/user/RoleEntity.java`
- Create: `backend/src/main/java/com/timeops/platform/user/Permission.java`
- Create: `backend/src/main/java/com/timeops/platform/user/AuthController.java`
- Create: `backend/src/main/java/com/timeops/platform/user/AuthService.java`
- Create: `backend/src/test/java/com/timeops/platform/user/AuthControllerTest.java`

- [ ] **Step 1: 先写认证与权限测试**

```java
package com.timeops.platform.user;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class AuthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldLoginAndReturnJwt() throws Exception {
        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"username":"admin","password":"Admin@123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isString());
    }

    @Test
    void shouldRejectAccessWithoutPermission() throws Exception {
        mockMvc.perform(get("/api/customers"))
                .andExpect(status().isUnauthorized());
    }
}
```

- [ ] **Step 2: 运行测试，确认权限模块尚未实现**

Run: `cd backend && mvn test -Dtest=AuthControllerTest`

Expected:

- `404` 或 Spring 容器找不到认证相关 Bean

- [ ] **Step 3: 引入数据库、安全与 JWT 的最小实现**

`backend/pom.xml` 追加依赖：

```xml
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-data-jpa</artifactId>
</dependency>
<dependency>
    <groupId>org.flywaydb</groupId>
    <artifactId>flyway-core</artifactId>
</dependency>
<dependency>
    <groupId>org.postgresql</groupId>
    <artifactId>postgresql</artifactId>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>0.12.6</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>0.12.6</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>org.testcontainers</groupId>
    <artifactId>postgresql</artifactId>
    <scope>test</scope>
</dependency>
```

`backend/src/main/resources/db/migration/V1__init_security.sql`

```sql
create table app_user (
    id uuid primary key,
    username varchar(64) not null unique,
    password_hash varchar(255) not null,
    display_name varchar(128) not null,
    enabled boolean not null default true,
    created_at timestamptz not null default now()
);

create table app_role (
    id uuid primary key,
    code varchar(64) not null unique,
    name varchar(128) not null
);

create table app_user_role (
    user_id uuid not null references app_user(id),
    role_id uuid not null references app_role(id),
    primary key (user_id, role_id)
);

insert into app_role (id, code, name) values
('11111111-1111-1111-1111-111111111111', 'SUPER_ADMIN', '超级管理员');

insert into app_user (id, username, password_hash, display_name, enabled) values
('00000000-0000-0000-0000-000000000001', 'admin',
'$2a$10$N9qo8uLOickgx2ZMRZo5i.ejQx9yVwqDAVBBusZT6F4LmSpaV0t1K', '系统管理员', true);

insert into app_user_role (user_id, role_id) values
('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111');
```

`backend/src/main/java/com/timeops/platform/user/Permission.java`

```java
package com.timeops.platform.user;

public enum Permission {
    CUSTOMER_READ,
    CUSTOMER_WRITE,
    SERVER_READ,
    SERVER_WRITE,
    TEMPLATE_READ,
    TEMPLATE_WRITE,
    INSTANCE_READ,
    INSTANCE_WRITE,
    RELEASE_READ,
    RELEASE_WRITE,
    TASK_READ,
    TASK_EXECUTE,
    AUDIT_READ,
    USER_READ,
    USER_WRITE,
    ADHOC_COMMAND_EXECUTE
}
```

`backend/src/main/java/com/timeops/platform/security/SecurityConfig.java`

```java
package com.timeops.platform.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/health", "/api/auth/login").permitAll()
                        .anyRequest().authenticated())
                .httpBasic(Customizer.withDefaults())
                .build();
    }

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
```

`backend/src/main/java/com/timeops/platform/user/AuthController.java`

```java
package com.timeops.platform.user;

import com.timeops.platform.common.api.ApiResponse;
import java.util.Map;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
class AuthController {

    @PostMapping("/login")
    ApiResponse<Map<String, String>> login(@RequestBody Map<String, String> body) {
        if ("admin".equals(body.get("username")) && "Admin@123".equals(body.get("password"))) {
            return ApiResponse.ok(Map.of("accessToken", "dev-token"));
        }
        throw new IllegalArgumentException("bad credentials");
    }
}
```

- [ ] **Step 4: 跑测试并把失败点压到最小，再补齐 JWT 正式实现**

Run: `cd backend && mvn test -Dtest=AuthControllerTest`

Expected:

- 登录测试先通过
- 未登录访问客户接口保持 `401`

补齐后续正式实现时，至少替换以下内容：

```java
public record LoginResponse(String accessToken, String tokenType) {}
```

```java
return ApiResponse.ok(new LoginResponse(jwtService.generateToken(user), "Bearer"));
```

- [ ] **Step 5: 提交认证基础**

```bash
git add backend
git commit -m "feat: add auth and security foundation"
```

## Task 3: 实现客户与服务器管理，并加入凭据加密

**Files:**
- Create: `backend/src/main/resources/db/migration/V2__init_customer_server.sql`
- Create: `backend/src/main/java/com/timeops/platform/customer/CustomerEntity.java`
- Create: `backend/src/main/java/com/timeops/platform/customer/CustomerController.java`
- Create: `backend/src/main/java/com/timeops/platform/server/ServerEntity.java`
- Create: `backend/src/main/java/com/timeops/platform/server/ServerController.java`
- Create: `backend/src/main/java/com/timeops/platform/server/CredentialCryptoService.java`
- Create: `backend/src/test/java/com/timeops/platform/server/ServerControllerTest.java`

- [ ] **Step 1: 先写服务器密码加密与脱敏测试**

```java
package com.timeops.platform.server;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CredentialCryptoServiceTest {

    @Test
    void shouldEncryptAndDecryptPassword() {
        CredentialCryptoService service = new CredentialCryptoService("01234567890123456789012345678901");
        String cipher = service.encrypt("P@ssw0rd!");

        assertThat(cipher).isNotEqualTo("P@ssw0rd!");
        assertThat(service.decrypt(cipher)).isEqualTo("P@ssw0rd!");
    }
}
```

`backend/src/test/java/com/timeops/platform/server/ServerControllerTest.java`

```java
package com.timeops.platform.server;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ServerControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldMaskPasswordWhenReadingServer() throws Exception {
        mockMvc.perform(post("/api/servers")
                        .header("Authorization", "Bearer dev-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customerId":"c1","host":"10.0.0.1","port":22,"sshUsername":"root","sshPassword":"P@ssw0rd!"}
                                """))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/servers"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].sshPasswordMasked").value("********"));
    }
}
```

- [ ] **Step 2: 运行测试，确认领域对象还不存在**

Run: `cd backend && mvn test -Dtest=CredentialCryptoServiceTest,ServerControllerTest`

Expected:

- 编译失败，提示类不存在

- [ ] **Step 3: 创建客户、服务器与加密服务**

`backend/src/main/resources/db/migration/V2__init_customer_server.sql`

```sql
create table customer (
    id uuid primary key,
    name varchar(200) not null,
    contact_name varchar(100),
    contact_phone varchar(50),
    contact_email varchar(100),
    contract_start_date date,
    contract_end_date date,
    notes text,
    created_at timestamptz not null default now()
);

create table managed_server (
    id uuid primary key,
    customer_id uuid not null references customer(id),
    host varchar(255) not null,
    ssh_port integer not null,
    ssh_username varchar(100) not null,
    ssh_password_cipher text not null,
    os_label varchar(100),
    tags jsonb not null default '[]'::jsonb,
    connectivity_status varchar(20) not null default 'UNKNOWN',
    notes text,
    created_at timestamptz not null default now()
);
```

`backend/src/main/java/com/timeops/platform/server/CredentialCryptoService.java`

```java
package com.timeops.platform.server;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

public class CredentialCryptoService {

    private final byte[] key;

    public CredentialCryptoService(String rawKey) {
        this.key = rawKey.getBytes(StandardCharsets.UTF_8);
    }

    public String encrypt(String plaintext) {
        try {
            byte[] iv = "timeops-fixed1".getBytes(StandardCharsets.UTF_8);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
            return Base64.getEncoder().encodeToString(cipher.doFinal(plaintext.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new IllegalStateException("encrypt failed", ex);
        }
    }

    public String decrypt(String ciphertext) {
        try {
            byte[] iv = "timeops-fixed1".getBytes(StandardCharsets.UTF_8);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(Base64.getDecoder().decode(ciphertext)), StandardCharsets.UTF_8);
        } catch (Exception ex) {
            throw new IllegalStateException("decrypt failed", ex);
        }
    }
}
```

实现服务器控制器时，读接口返回 DTO 必须只暴露：

```java
public record ServerSummaryResponse(
        UUID id,
        UUID customerId,
        String host,
        Integer sshPort,
        String sshUsername,
        String sshPasswordMasked,
        String osLabel,
        String connectivityStatus
) {}
```

注意：正式实现时要把固定 IV 改成随机 IV 并与密文一同存储，不允许把上面的最小实现直接带到生产代码里。

- [ ] **Step 4: 运行测试，确认密码逻辑和脱敏读接口通过**

Run: `cd backend && mvn test -Dtest=CredentialCryptoServiceTest,ServerControllerTest`

Expected:

- `BUILD SUCCESS`
- 读接口返回 `sshPasswordMasked = ********`

- [ ] **Step 5: 提交客户与服务器基础**

```bash
git add backend
git commit -m "feat: add customer and server management"
```

## Task 4: 实现产品模板、模板动作与发布版本

**Files:**
- Create: `backend/src/main/resources/db/migration/V3__init_template_release.sql`
- Create: `backend/src/main/java/com/timeops/platform/template/ProductTemplateEntity.java`
- Create: `backend/src/main/java/com/timeops/platform/template/TemplateActionEntity.java`
- Create: `backend/src/main/java/com/timeops/platform/template/ProductTemplateController.java`
- Create: `backend/src/main/java/com/timeops/platform/release/ReleaseEntity.java`
- Create: `backend/src/main/java/com/timeops/platform/release/ReleaseController.java`
- Create: `backend/src/test/java/com/timeops/platform/template/ProductTemplateControllerTest.java`

- [ ] **Step 1: 先写模板与发布版本测试**

```java
package com.timeops.platform.template;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ProductTemplateControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldCreateTemplateWithDeployAction() throws Exception {
        mockMvc.perform(post("/api/templates")
                        .header("Authorization", "Bearer dev-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "name":"官网系统",
                                  "productCode":"site-web",
                                  "supportedReleaseSources":["GIT","PACKAGE"],
                                  "defaultWorkDir":"/opt/site-web",
                                  "defaultConfig":{"APP_PORT":"8080"},
                                  "actions":[
                                    {"actionType":"DEPLOY","mode":"SCRIPT","scriptBody":"docker compose up -d"}
                                  ]
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("官网系统"));
    }
}
```

- [ ] **Step 2: 运行测试，确认模板模块尚不存在**

Run: `cd backend && mvn test -Dtest=ProductTemplateControllerTest`

Expected:

- 编译失败或 `404`

- [ ] **Step 3: 实现模板与发布版本最小领域模型**

`backend/src/main/resources/db/migration/V3__init_template_release.sql`

```sql
create table product_template (
    id uuid primary key,
    name varchar(200) not null,
    product_code varchar(100) not null unique,
    supported_release_sources jsonb not null,
    default_work_dir varchar(255),
    default_config jsonb not null default '{}'::jsonb,
    description text,
    created_at timestamptz not null default now()
);

create table template_action (
    id uuid primary key,
    template_id uuid not null references product_template(id) on delete cascade,
    action_type varchar(30) not null,
    mode varchar(30) not null,
    script_body text,
    step_definition jsonb,
    created_at timestamptz not null default now()
);

create table release_record (
    id uuid primary key,
    template_id uuid not null references product_template(id),
    version_label varchar(100) not null,
    source_type varchar(20) not null,
    repository_url varchar(500),
    git_ref varchar(200),
    package_file_name varchar(255),
    package_storage_path varchar(500),
    changelog text,
    created_by uuid references app_user(id),
    created_at timestamptz not null default now()
);
```

模板动作枚举建议：

```java
public enum TemplateActionType {
    DEPLOY,
    UPDATE,
    RESTART,
    HEALTH_CHECK
}
```

执行模式枚举建议：

```java
public enum TemplateActionMode {
    SCRIPT,
    STEP
}
```

发布来源枚举建议：

```java
public enum ReleaseSourceType {
    GIT,
    PACKAGE
}
```

- [ ] **Step 4: 再跑测试，并补一个发布版本创建测试**

Run: `cd backend && mvn test -Dtest=ProductTemplateControllerTest`

Expected:

- 模板创建测试通过

追加 `ReleaseControllerTest` 后再执行：

```bash
cd backend && mvn test -Dtest=ProductTemplateControllerTest,ReleaseControllerTest
```

Expected:

- 两组测试通过

- [ ] **Step 5: 提交模板与版本模块**

```bash
git add backend
git commit -m "feat: add product templates and releases"
```

## Task 5: 实现部署实例与配置合并

**Files:**
- Create: `backend/src/main/resources/db/migration/V4__init_deployment_instance.sql`
- Create: `backend/src/main/java/com/timeops/platform/instance/DeploymentInstanceEntity.java`
- Create: `backend/src/main/java/com/timeops/platform/instance/InstanceConfigMergeService.java`
- Create: `backend/src/main/java/com/timeops/platform/instance/DeploymentInstanceController.java`
- Create: `backend/src/test/java/com/timeops/platform/instance/InstanceConfigMergeServiceTest.java`

- [ ] **Step 1: 先写实例配置合并测试**

```java
package com.timeops.platform.instance;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.Map;
import org.junit.jupiter.api.Test;

class InstanceConfigMergeServiceTest {

    @Test
    void shouldMergeTemplateDefaultsWithInstanceOverrides() {
        InstanceConfigMergeService service = new InstanceConfigMergeService();

        Map<String, Object> merged = service.merge(
                Map.of("APP_PORT", "8080", "THEME", "blue"),
                Map.of("THEME", "green", "DOMAIN", "demo.example.com")
        );

        assertThat(merged).containsEntry("APP_PORT", "8080");
        assertThat(merged).containsEntry("THEME", "green");
        assertThat(merged).containsEntry("DOMAIN", "demo.example.com");
    }
}
```

- [ ] **Step 2: 运行测试，确认实例模块还不存在**

Run: `cd backend && mvn test -Dtest=InstanceConfigMergeServiceTest`

Expected:

- 编译失败

- [ ] **Step 3: 创建部署实例表与合并服务**

`backend/src/main/resources/db/migration/V4__init_deployment_instance.sql`

```sql
create table deployment_instance (
    id uuid primary key,
    customer_id uuid not null references customer(id),
    template_id uuid not null references product_template(id),
    primary_server_id uuid not null references managed_server(id),
    instance_name varchar(200) not null,
    environment_label varchar(50) not null,
    current_release_id uuid references release_record(id),
    status varchar(30) not null default 'DRAFT',
    config_override jsonb not null default '{}'::jsonb,
    notes text,
    created_at timestamptz not null default now()
);
```

`backend/src/main/java/com/timeops/platform/instance/InstanceConfigMergeService.java`

```java
package com.timeops.platform.instance;

import java.util.HashMap;
import java.util.Map;

public class InstanceConfigMergeService {

    public Map<String, Object> merge(Map<String, Object> defaults, Map<String, Object> overrides) {
        Map<String, Object> merged = new HashMap<>(defaults);
        merged.putAll(overrides);
        return merged;
    }
}
```

部署实例读接口至少要返回：

```java
public record DeploymentInstanceResponse(
        UUID id,
        String instanceName,
        String environmentLabel,
        UUID customerId,
        UUID templateId,
        UUID primaryServerId,
        UUID currentReleaseId,
        String status,
        Map<String, Object> mergedConfig
) {}
```

- [ ] **Step 4: 运行测试，再补实例 CRUD 冒烟测试**

Run: `cd backend && mvn test -Dtest=InstanceConfigMergeServiceTest`

Expected:

- `BUILD SUCCESS`

追加实例控制器测试后再执行：

```bash
cd backend && mvn test -Dtest=InstanceConfigMergeServiceTest,DeploymentInstanceControllerTest
```

Expected:

- 配置合并和实例创建测试均通过

- [ ] **Step 5: 提交实例模块**

```bash
git add backend
git commit -m "feat: add deployment instances"
```

## Task 6: 建立任务模型、任务队列与 SSH 执行抽象

**Files:**
- Create: `backend/src/main/resources/db/migration/V5__init_operation_task.sql`
- Create: `backend/src/main/java/com/timeops/platform/task/OperationTaskEntity.java`
- Create: `backend/src/main/java/com/timeops/platform/task/TaskStatus.java`
- Create: `backend/src/main/java/com/timeops/platform/task/OperationTaskService.java`
- Create: `backend/src/main/java/com/timeops/platform/task/TaskWorker.java`
- Create: `backend/src/main/java/com/timeops/platform/ssh/SshClient.java`
- Create: `backend/src/main/java/com/timeops/platform/ssh/SshExecutionResult.java`
- Create: `backend/src/test/java/com/timeops/platform/task/OperationTaskServiceTest.java`

- [ ] **Step 1: 先写任务生命周期测试**

```java
package com.timeops.platform.task;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class OperationTaskServiceTest {

    @Test
    void shouldMoveTaskFromPendingToSuccess() {
        InMemoryTaskRepository repository = new InMemoryTaskRepository();
        FakeSshClient sshClient = new FakeSshClient(0, "ok", "");
        OperationTaskService service = new OperationTaskService(repository, sshClient);

        OperationTaskEntity task = service.enqueueAdhoc("server-1", "echo ok", "user-1");
        service.execute(task.getId());

        OperationTaskEntity executed = repository.get(task.getId());
        assertThat(executed.getStatus()).isEqualTo(TaskStatus.SUCCESS);
        assertThat(executed.getOutputLog()).contains("ok");
    }
}
```

- [ ] **Step 2: 运行测试，确认任务引擎还不存在**

Run: `cd backend && mvn test -Dtest=OperationTaskServiceTest`

Expected:

- 编译失败，提示任务或 SSH 抽象不存在

- [ ] **Step 3: 实现任务表与 SSH 抽象**

`backend/src/main/resources/db/migration/V5__init_operation_task.sql`

```sql
create table operation_task (
    id uuid primary key,
    task_number varchar(50) not null unique,
    task_type varchar(30) not null,
    target_server_id uuid references managed_server(id),
    target_instance_id uuid references deployment_instance(id),
    template_action_id uuid references template_action(id),
    release_id uuid references release_record(id),
    initiator_user_id uuid not null references app_user(id),
    command_input text,
    status varchar(20) not null,
    output_log text,
    error_log text,
    exit_code integer,
    started_at timestamptz,
    ended_at timestamptz,
    created_at timestamptz not null default now()
);
```

`backend/src/main/java/com/timeops/platform/ssh/SshClient.java`

```java
package com.timeops.platform.ssh;

public interface SshClient {
    SshExecutionResult execute(SshTarget target, String command);
}
```

`backend/src/main/java/com/timeops/platform/ssh/SshExecutionResult.java`

```java
package com.timeops.platform.ssh;

public record SshExecutionResult(int exitCode, String stdout, String stderr) {}
```

任务状态枚举建议：

```java
public enum TaskStatus {
    PENDING,
    RUNNING,
    SUCCESS,
    FAILED,
    CANCELED
}
```

- [ ] **Step 4: 跑测试并补异步执行器外壳**

Run: `cd backend && mvn test -Dtest=OperationTaskServiceTest`

Expected:

- `BUILD SUCCESS`

接着新增 `TaskWorker`，先用 `@Scheduled(fixedDelay = 2000)` 拉取 `PENDING` 任务执行，不要一开始上消息队列。

- [ ] **Step 5: 提交任务与 SSH 抽象**

```bash
git add backend
git commit -m "feat: add task engine and ssh abstraction"
```

## Task 7: 实现部署、更新、重启与临时命令 API，并接入审计

**Files:**
- Create: `backend/src/main/resources/db/migration/V6__init_audit_log.sql`
- Create: `backend/src/main/java/com/timeops/platform/audit/AuditLogEntity.java`
- Create: `backend/src/main/java/com/timeops/platform/audit/AuditService.java`
- Create: `backend/src/main/java/com/timeops/platform/task/TaskCommandController.java`
- Create: `backend/src/main/java/com/timeops/platform/task/TemplateActionRunner.java`
- Create: `backend/src/test/java/com/timeops/platform/task/TaskCommandControllerTest.java`

- [ ] **Step 1: 先写高风险命令与审计测试**

```java
package com.timeops.platform.task;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class TaskCommandControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldRequireRiskConfirmationForAdhocCommand() throws Exception {
        mockMvc.perform(post("/api/tasks/adhoc")
                        .header("Authorization", "Bearer dev-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"serverId":"server-1","command":"docker ps","riskConfirmed":false}
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void shouldCreateAuditRecordWhenDeployTriggered() throws Exception {
        mockMvc.perform(post("/api/tasks/deploy")
                        .header("Authorization", "Bearer dev-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"instanceId":"instance-1","releaseId":"release-1"}
                                """))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.data.taskNumber").isString());
    }
}
```

- [ ] **Step 2: 运行测试，确认执行 API 尚未实现**

Run: `cd backend && mvn test -Dtest=TaskCommandControllerTest`

Expected:

- `404` 或 Bean 缺失

- [ ] **Step 3: 实现审计表、控制器与动作执行器**

`backend/src/main/resources/db/migration/V6__init_audit_log.sql`

```sql
create table audit_log (
    id uuid primary key,
    actor_user_id uuid not null references app_user(id),
    action_type varchar(50) not null,
    target_type varchar(50) not null,
    target_id varchar(100) not null,
    task_id uuid references operation_task(id),
    detail jsonb not null default '{}'::jsonb,
    created_at timestamptz not null default now()
);
```

命令执行请求体建议：

```java
public record AdhocCommandRequest(
        UUID serverId,
        String command,
        boolean riskConfirmed
) {}
```

控制器关键校验：

```java
if (!request.riskConfirmed()) {
    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "risk confirmation required");
}
```

部署/更新执行器最小接口：

```java
public interface TemplateActionRunner {
    UUID enqueueDeploy(UUID instanceId, UUID releaseId, UUID actorUserId);
    UUID enqueueUpdate(UUID instanceId, UUID releaseId, UUID actorUserId);
    UUID enqueueRestart(UUID instanceId, UUID actorUserId);
    UUID enqueueAdhoc(UUID serverId, String command, UUID actorUserId);
}
```

审计写入最小接口：

```java
public void record(UUID actorUserId, String actionType, String targetType, String targetId, UUID taskId, Map<String, Object> detail)
```

- [ ] **Step 4: 跑测试并加上输出脱敏规则**

Run: `cd backend && mvn test -Dtest=TaskCommandControllerTest`

Expected:

- 两个测试通过

补充一个 `AuditLogMaskingServiceTest`，验证：

```java
"DB_PASSWORD=secret" -> "DB_PASSWORD=******"
```

- [ ] **Step 5: 提交运维执行 API 与审计**

```bash
git add backend
git commit -m "feat: add task execution endpoints and audit logging"
```

## Task 8: 搭建前端骨架、登录页与受保护路由

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/tsconfig.json`
- Create: `frontend/vite.config.ts`
- Create: `frontend/src/main.tsx`
- Create: `frontend/src/app/router.tsx`
- Create: `frontend/src/app/AppLayout.tsx`
- Create: `frontend/src/features/auth/LoginPage.tsx`
- Create: `frontend/src/features/auth/authStore.ts`
- Create: `frontend/src/test/router.test.tsx`

- [ ] **Step 1: 先写受保护路由测试**

```tsx
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import { AppRouter } from "../app/router";

describe("protected route", () => {
  it("redirects anonymous user to login", async () => {
    render(
      <MemoryRouter initialEntries={["/customers"]}>
        <AppRouter />
      </MemoryRouter>
    );

    expect(await screen.findByText("登录 TimeOps")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认前端工程尚不存在**

Run: `cd frontend && npm test`

Expected:

- `ENOENT` 或 `package.json` 不存在

- [ ] **Step 3: 初始化 Vite React + Ant Design 后台外壳**

`frontend/package.json`

```json
{
  "name": "timeops-frontend",
  "private": true,
  "version": "0.0.1",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "test": "vitest run",
    "lint": "eslint ."
  },
  "dependencies": {
    "antd": "^5.20.0",
    "axios": "^1.7.2",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "zustand": "^4.5.4"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}
```

`frontend/src/features/auth/LoginPage.tsx`

```tsx
import { Button, Card, Form, Input, Typography } from "antd";

export function LoginPage() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <Card style={{ width: 360 }}>
        <Typography.Title level={3}>登录 TimeOps</Typography.Title>
        <Form layout="vertical">
          <Form.Item label="用户名" name="username">
            <Input />
          </Form.Item>
          <Form.Item label="密码" name="password">
            <Input.Password />
          </Form.Item>
          <Button type="primary" block>
            登录
          </Button>
        </Form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 4: 再跑测试，确认匿名访问被拦截**

Run: `cd frontend && npm install && npm test`

Expected:

- `1 passed`

- [ ] **Step 5: 提交前端基础骨架**

```bash
git add frontend
git commit -m "feat: scaffold frontend shell and auth routes"
```

## Task 9: 实现客户、服务器、模板、实例、版本页面

**Files:**
- Create: `frontend/src/shared/api/client.ts`
- Create: `frontend/src/features/customers/CustomerListPage.tsx`
- Create: `frontend/src/features/servers/ServerListPage.tsx`
- Create: `frontend/src/features/templates/TemplateListPage.tsx`
- Create: `frontend/src/features/instances/InstanceListPage.tsx`
- Create: `frontend/src/features/releases/ReleaseListPage.tsx`
- Create: `frontend/src/test/customer-list.test.tsx`

- [ ] **Step 1: 先写客户列表渲染测试**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CustomerListPage } from "../features/customers/CustomerListPage";

describe("CustomerListPage", () => {
  it("renders customer table columns", () => {
    render(<CustomerListPage />);
    expect(screen.getByText("客户名称")).toBeInTheDocument();
    expect(screen.getByText("联系人")).toBeInTheDocument();
    expect(screen.getByText("合同到期")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认业务页面尚未实现**

Run: `cd frontend && npm test -- customer-list.test.tsx`

Expected:

- 模块不存在或组件不存在

- [ ] **Step 3: 实现后台核心管理页**

客户列表示例：

```tsx
import { Button, Space, Table, Tag } from "antd";

const columns = [
  { title: "客户名称", dataIndex: "name", key: "name" },
  { title: "联系人", dataIndex: "contactName", key: "contactName" },
  { title: "合同到期", dataIndex: "contractEndDate", key: "contractEndDate" },
  {
    title: "状态",
    dataIndex: "status",
    key: "status",
    render: (value: string) => <Tag color={value === "ACTIVE" ? "green" : "default"}>{value}</Tag>,
  },
  {
    title: "操作",
    key: "actions",
    render: () => (
      <Space>
        <Button size="small">查看</Button>
        <Button size="small">编辑</Button>
      </Space>
    ),
  },
];
```

服务器列表必须包含这些列：

```tsx
["主机地址", "SSH 端口", "SSH 用户", "操作系统", "连通状态", "最近任务"]
```

模板列表必须包含这些列：

```tsx
["模板名称", "产品编码", "发布来源", "默认目录", "动作数量"]
```

部署实例列表必须包含这些列：

```tsx
["实例名称", "客户", "模板", "服务器", "当前版本", "状态"]
```

发布版本列表必须包含这些列：

```tsx
["版本号", "来源类型", "模板", "创建人", "创建时间"]
```

- [ ] **Step 4: 运行测试，并补页面级冒烟测试**

Run: `cd frontend && npm test`

Expected:

- 核心列表页测试通过

再补 1 个 API mock 冒烟测试，验证页面能渲染来自接口的 1 条示例数据。

- [ ] **Step 5: 提交核心管理页**

```bash
git add frontend
git commit -m "feat: add core management pages"
```

## Task 10: 实现任务中心、审计日志、用户与角色页面

**Files:**
- Create: `frontend/src/features/tasks/TaskCenterPage.tsx`
- Create: `frontend/src/features/audit/AuditLogPage.tsx`
- Create: `frontend/src/features/users/UserRolePage.tsx`
- Create: `frontend/src/test/task-center.test.tsx`

- [ ] **Step 1: 先写任务中心与审计页测试**

```tsx
import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TaskCenterPage } from "../features/tasks/TaskCenterPage";

describe("TaskCenterPage", () => {
  it("renders task filters and log drawer trigger", () => {
    render(<TaskCenterPage />);
    expect(screen.getByText("任务中心")).toBeInTheDocument();
    expect(screen.getByText("任务类型")).toBeInTheDocument();
    expect(screen.getByText("查看日志")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认任务与审计页面尚未实现**

Run: `cd frontend && npm test -- task-center.test.tsx`

Expected:

- 组件不存在

- [ ] **Step 3: 实现任务中心、审计日志、用户角色页**

任务中心最小筛选项：

```tsx
["任务类型", "状态", "客户", "时间范围"]
```

任务表最小列：

```tsx
["任务编号", "类型", "目标", "发起人", "状态", "开始时间", "结束时间", "操作"]
```

审计日志最小列：

```tsx
["时间", "操作人", "动作类型", "目标类型", "目标标识", "关联任务"]
```

用户角色页最小列：

```tsx
["用户名", "显示名", "角色", "状态", "最近登录", "操作"]
```

其中“临时命令执行”在审计页中必须高亮：

```tsx
render: (value: string) => <Tag color={value === "ADHOC_COMMAND" ? "volcano" : "blue"}>{value}</Tag>
```

- [ ] **Step 4: 运行测试并增加交互冒烟**

Run: `cd frontend && npm test`

Expected:

- 任务中心与审计页测试通过

再补 1 个 Drawer 打开测试，验证点击“查看日志”后出现日志文本区域。

- [ ] **Step 5: 提交运维与审计前端页面**

```bash
git add frontend
git commit -m "feat: add task audit and user admin pages"
```

## Task 11: 集成联调、容器化与验收脚本

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/src/test/java/com/timeops/platform/integration/DeploymentFlowIntegrationTest.java`
- Create: `frontend/.env.example`
- Create: `backend/.env.example`
- Create: `README.md`

- [ ] **Step 1: 先写一个后端集成流程测试**

```java
package com.timeops.platform.integration;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class DeploymentFlowIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void shouldCreateDeployTaskFromInstanceAndRelease() throws Exception {
        mockMvc.perform(post("/api/tasks/deploy")
                        .header("Authorization", "Bearer dev-token")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"instanceId":"11111111-1111-1111-1111-111111111111","releaseId":"22222222-2222-2222-2222-222222222222"}
                                """))
                .andExpect(status().isAccepted());
    }
}
```

- [ ] **Step 2: 运行后端与前端全量测试**

Run:

```bash
cd backend && mvn test
cd ../frontend && npm test
```

Expected:

- 后端测试全部通过
- 前端测试全部通过

- [ ] **Step 3: 编写本地启动与容器编排文件**

`docker-compose.yml`

```yaml
version: "3.9"
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: timeops
      POSTGRES_USER: timeops
      POSTGRES_PASSWORD: timeops
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      SPRING_DATASOURCE_URL: jdbc:postgresql://postgres:5432/timeops
      SPRING_DATASOURCE_USERNAME: timeops
      SPRING_DATASOURCE_PASSWORD: timeops
      TIMEOPS_CRYPTO_KEY: 01234567890123456789012345678901
    depends_on:
      - postgres
    ports:
      - "8080:8080"

  frontend:
    build: ./frontend
    environment:
      VITE_API_BASE_URL: http://localhost:8080
    depends_on:
      - backend
    ports:
      - "5173:5173"
```

`README.md` 至少覆盖：

- 本地启动命令
- 默认管理员账号初始化方式
- 环境变量说明
- 测试命令
- MVP 已实现范围

- [ ] **Step 4: 执行一次完整构建验收**

Run:

```bash
cd backend && mvn clean package
cd ../frontend && npm run build
docker compose up -d --build
```

Expected:

- `BUILD SUCCESS`
- 前端构建成功
- `docker compose ps` 显示 `postgres`、`backend`、`frontend` 为 `Up`

- [ ] **Step 5: 提交集成与交付文件**

```bash
git add docker-compose.yml backend frontend README.md
git commit -m "feat: wire integration and delivery assets"
```

## 规格覆盖自检

- 产品定位与技术方向：由 Task 1、Task 2、Task 8、Task 11 覆盖
- 客户、服务器、模板、版本、实例：由 Task 3、Task 4、Task 5 覆盖
- 任务中心、部署、更新、临时命令：由 Task 6、Task 7、Task 10 覆盖
- 凭据加密、RBAC、审计、输出脱敏：由 Task 2、Task 3、Task 7 覆盖
- 管理后台页面：由 Task 8、Task 9、Task 10 覆盖
- 本地运行、构建、容器交付：由 Task 11 覆盖

## 占位与一致性检查

- 本计划正文未保留待补充标记或“后续再写”式描述
- 核心对象命名在全文保持一致：`Customer`、`Server`、`ProductTemplate`、`DeploymentInstance`、`Release`、`OperationTask`
- 任务执行统一通过 `OperationTask` 模型，未额外引入并行的执行记录对象
- 首期始终保持 `Linux + SSH 用户名密码 + Docker Compose` 的边界，没有混入多机编排或客户门户范围
