package com.artforyou.store.repository;

import com.artforyou.store.entity.OrderEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface OrderRepository extends JpaRepository<OrderEntity, Long> {

    List<OrderEntity> findByMobileOrderByCreatedAtDesc(String mobile);

}