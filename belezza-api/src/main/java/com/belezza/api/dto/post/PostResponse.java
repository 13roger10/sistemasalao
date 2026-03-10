package com.belezza.api.dto.post;

import com.belezza.api.entity.PlataformaSocial;
import com.belezza.api.entity.Post;
import com.belezza.api.entity.StatusPost;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostResponse {

    private Long id;
    private Long salonId;
    private Long criadorId;
    private String criadorNome;
    private String imagemUrl;
    private String imagemOriginalUrl;
    private String thumbnailUrl;
    private String legenda;
    private List<String> hashtags;
    private StatusPost status;
    private String statusDescricao;
    private List<PlataformaSocial> plataformas;
    private LocalDateTime agendadoPara;
    private LocalDateTime publicadoEm;
    private String publishErrorMessage;
    private int tentativasPublicacao;
    private int curtidas;
    private int comentarios;
    private int compartilhamentos;
    private int alcance;
    private LocalDateTime criadoEm;
    private LocalDateTime atualizadoEm;

    public static PostResponse fromEntity(Post post) {
        return PostResponse.builder()
                .id(post.getId())
                .salonId(post.getSalon().getId())
                .criadorId(post.getCriador().getId())
                .criadorNome(post.getCriador().getNome())
                .imagemUrl(post.getImagemUrl())
                .imagemOriginalUrl(post.getImagemOriginalUrl())
                .thumbnailUrl(post.getThumbnailUrl())
                .legenda(post.getLegenda())
                .hashtags(post.getHashtags())
                .status(post.getStatus())
                .statusDescricao(post.getStatus().getDescription())
                .plataformas(post.getPlataformas())
                .agendadoPara(post.getAgendadoPara())
                .publicadoEm(post.getPublicadoEm())
                .publishErrorMessage(post.getPublishErrorMessage())
                .tentativasPublicacao(post.getTentativasPublicacao())
                .curtidas(post.getCurtidas())
                .comentarios(post.getComentarios())
                .compartilhamentos(post.getCompartilhamentos())
                .alcance(post.getAlcance())
                .criadoEm(post.getCriadoEm())
                .atualizadoEm(post.getAtualizadoEm())
                .build();
    }
}
