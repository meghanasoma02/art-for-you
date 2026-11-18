package com.artforyou.store.repository;
import com.artforyou.store.entity.CollectionEntity; import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface CollectionRepository extends JpaRepository<CollectionEntity,String>{ List<CollectionEntity> findAllByOrderBySortOrderAsc(); }
