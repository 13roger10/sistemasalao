package com.belezza.api.repository;

import com.belezza.api.entity.ConfiguracaoLembretesSalon;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ConfiguracaoLembretesSalonRepository extends JpaRepository<ConfiguracaoLembretesSalon, Long> {
}
