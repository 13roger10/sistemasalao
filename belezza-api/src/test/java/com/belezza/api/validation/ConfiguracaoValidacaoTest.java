package com.belezza.api.validation;

import com.belezza.api.dto.comissao.ConfiguracaoComissaoRequest;
import com.belezza.api.dto.salon.SalonRequest;
import com.belezza.api.dto.servico.ServicoRequest;
import com.belezza.api.entity.TipoComissao;
import com.belezza.api.entity.TipoServico;
import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Set;
import java.util.stream.Collectors;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("Configurações com valores impossíveis (BUG-032)")
class ConfiguracaoValidacaoTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private Set<String> camposInvalidos(Object request) {
        return validator.validate(request).stream()
                .map(ConstraintViolation::getPropertyPath).map(Object::toString)
                .collect(Collectors.toSet());
    }

    private ServicoRequest servico(int minutos) {
        return ServicoRequest.builder().nome("Corte").preco(BigDecimal.TEN).duracaoMinutos(minutos)
                .tipo(TipoServico.values()[0]).build();
    }

    @Test
    @DisplayName("Serviço de 9999 minutos é recusado; até 720 é aceito")
    void duracaoDoServico() {
        assertThat(camposInvalidos(servico(9999))).contains("duracaoMinutos");
        assertThat(camposInvalidos(servico(720))).isEmpty();
    }

    @Test
    @DisplayName("Comissão de 150% é recusada; 100% e valor fixo de 150 são aceitos")
    void comissao() {
        assertThat(camposInvalidos(new ConfiguracaoComissaoRequest(TipoComissao.PORCENTAGEM, new BigDecimal("150"))))
                .contains("porcentagemAte100");
        assertThat(camposInvalidos(new ConfiguracaoComissaoRequest(TipoComissao.PORCENTAGEM, new BigDecimal("100")))).isEmpty();
        assertThat(camposInvalidos(new ConfiguracaoComissaoRequest(TipoComissao.FIXO, new BigDecimal("150")))).isEmpty();
    }

    @Test
    @DisplayName("Intervalo, antecedência, cancelamento e faltas fora dos limites são recusados")
    void limitesDoSalao() {
        SalonRequest request = SalonRequest.builder().nome("Salão")
                .intervaloAgendamentoMinutos(0).antecedenciaMinimaHoras(-1)
                .cancelamentoMinimoHoras(10000).maxNoShowsPermitidos(0).build();

        assertThat(camposInvalidos(request)).containsExactlyInAnyOrder("intervaloAgendamentoMinutos",
                "antecedenciaMinimaHoras", "cancelamentoMinimoHoras", "maxNoShowsPermitidos");

        SalonRequest valido = SalonRequest.builder().nome("Salão")
                .intervaloAgendamentoMinutos(30).antecedenciaMinimaHoras(2)
                .cancelamentoMinimoHoras(24).maxNoShowsPermitidos(3).build();
        assertThat(camposInvalidos(valido)).isEmpty();
    }
}
