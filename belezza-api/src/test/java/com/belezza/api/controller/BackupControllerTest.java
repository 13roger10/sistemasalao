package com.belezza.api.controller;

import com.belezza.api.entity.Role;
import com.belezza.api.entity.Usuario;
import com.belezza.api.exception.BusinessException;
import com.belezza.api.service.BackupService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;

@DisplayName("Backup do banco: só operadores da plataforma e sem path traversal")
class BackupControllerTest {

    private BackupController controller(String operadores) {
        BackupController c = new BackupController(mock(BackupService.class));
        ReflectionTestUtils.setField(c, "operadores", operadores);
        return c;
    }

    private Usuario admin(String email) {
        return Usuario.builder().id(1L).email(email).role(Role.ADMIN).build();
    }

    @Test
    @DisplayName("Dono de salão (ADMIN) não acessa o backup do banco inteiro")
    void adminDeSalaoNegado() {
        assertThatThrownBy(() -> controller("ops@plataforma.com").exigirOperadorDaPlataforma(admin("dono@salao.com")))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Sem operadores configurados, ninguém acessa pela API")
    void listaVaziaNegaTodos() {
        assertThatThrownBy(() -> controller("").exigirOperadorDaPlataforma(admin("admin@belezza.ai")))
                .isInstanceOf(AccessDeniedException.class);
    }

    @Test
    @DisplayName("Operador da lista acessa (e-mail sem diferenciar maiúsculas)")
    void operadorPermitido() {
        assertThatCode(() -> controller(" ops@plataforma.com , outro@x.com").exigirOperadorDaPlataforma(admin("OPS@Plataforma.com")))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Nome de arquivo fora do diretório de backups é recusado (path traversal)")
    void pathTraversal() throws Exception {
        Path dir = Files.createTempDirectory("backups");
        Path fora = Files.createTempFile("segredo", ".txt");
        BackupService service = new BackupService();
        ReflectionTestUtils.setField(service, "backupDirectory", dir.toString());

        assertThatThrownBy(() -> service.deletarBackup("../" + fora.getFileName()))
                .isInstanceOf(BusinessException.class).hasMessageContaining("invalido");
        assertThatThrownBy(() -> service.deletarBackup("belezza_backup_../../x"))
                .isInstanceOf(BusinessException.class);
        assertThat(Files.exists(fora)).isTrue();

        Path valido = Files.createFile(dir.resolve("belezza_backup_20260929_030000.sql.gz"));
        assertThat(service.deletarBackup(valido.getFileName().toString())).isTrue();
        assertThat(Files.exists(valido)).isFalse();
    }
}
