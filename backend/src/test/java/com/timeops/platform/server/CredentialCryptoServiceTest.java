package com.timeops.platform.server;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CredentialCryptoServiceTest {

    @Test
    void shouldEncryptAndDecryptPassword() {
        CredentialCryptoService credentialCryptoService =
                new CredentialCryptoService("MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY=");

        String cipherText = credentialCryptoService.encrypt("P@ssw0rd!");

        assertThat(cipherText).isNotEqualTo("P@ssw0rd!");
        assertThat(credentialCryptoService.decrypt(cipherText)).isEqualTo("P@ssw0rd!");
    }
}
