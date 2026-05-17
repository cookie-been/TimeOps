package com.timeops.platform.user;

import com.timeops.platform.common.api.ApiResponse;
import com.timeops.platform.security.SecurityPathConstants;
import com.timeops.platform.user.dto.LoginRequest;
import com.timeops.platform.user.dto.LoginResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping(SecurityPathConstants.AUTH_BASE_PATH)
public class AuthController {

    private static final String INVALID_CREDENTIALS_MESSAGE = "Invalid username or password";

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping(SecurityPathConstants.AUTH_LOGIN_PATH)
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest loginRequest) {
        try {
            return ApiResponse.ok(authService.login(loginRequest));
        } catch (AuthenticationException authenticationException) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, INVALID_CREDENTIALS_MESSAGE, authenticationException);
        }
    }
}
