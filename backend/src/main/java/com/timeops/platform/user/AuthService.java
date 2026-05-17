package com.timeops.platform.user;

import com.timeops.platform.security.JwtService;
import com.timeops.platform.user.dto.LoginRequest;
import com.timeops.platform.user.dto.LoginResponse;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class AuthService {

    private static final String BEARER_TOKEN_TYPE = "Bearer";

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;

    public AuthService(
            AuthenticationManager authenticationManager,
            JwtService jwtService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
    }

    public LoginResponse login(LoginRequest loginRequest) {
        if (!StringUtils.hasText(loginRequest.username()) || !StringUtils.hasText(loginRequest.password())) {
            throw new BadCredentialsException("Username or password is blank");
        }

        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(
                        loginRequest.username(),
                        loginRequest.password()
                )
        );
        UserEntity authenticatedUser = (UserEntity) authentication.getPrincipal();
        return new LoginResponse(jwtService.generateToken(authenticatedUser), BEARER_TOKEN_TYPE);
    }
}
