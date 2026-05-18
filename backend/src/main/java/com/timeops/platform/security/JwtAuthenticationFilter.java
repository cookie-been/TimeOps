package com.timeops.platform.security;

import com.timeops.platform.user.PlatformUserDetailsService;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String AUTHORIZATION_HEADER = "Authorization";
    private static final String BEARER_TOKEN_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final PlatformUserDetailsService platformUserDetailsService;

    public JwtAuthenticationFilter(JwtService jwtService, PlatformUserDetailsService platformUserDetailsService) {
        this.jwtService = jwtService;
        this.platformUserDetailsService = platformUserDetailsService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        String authorizationHeader = request.getHeader(AUTHORIZATION_HEADER);
        if (authorizationHeader == null || !authorizationHeader.startsWith(BEARER_TOKEN_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = authorizationHeader.substring(BEARER_TOKEN_PREFIX.length());
        String username;
        try {
            username = jwtService.extractUsername(token);
        } catch (JwtException | IllegalArgumentException exception) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication currentAuthentication = SecurityContextHolder.getContext().getAuthentication();
        if (username != null && shouldAuthenticate(currentAuthentication)) {
            try {
                UserDetails userDetails = platformUserDetailsService.loadUserByUsername(username);
                if (jwtService.isTokenValid(token, userDetails)) {
                    UsernamePasswordAuthenticationToken authenticationToken =
                            new UsernamePasswordAuthenticationToken(userDetails, null, userDetails.getAuthorities());
                    authenticationToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authenticationToken);
                }
            } catch (UsernameNotFoundException exception) {
                SecurityContextHolder.clearContext();
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean shouldAuthenticate(Authentication authentication) {
        return authentication == null || authentication instanceof AnonymousAuthenticationToken;
    }
}
