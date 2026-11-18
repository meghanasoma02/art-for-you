package com.artforyou.store.repository;
import com.artforyou.store.entity.Product; import org.springframework.data.jpa.repository.JpaRepository; import java.util.List;
public interface ProductRepository extends JpaRepository<Product,Long>{ List<Product> findByActiveTrueOrderBySortOrderAscIdAsc(); List<Product> findByActiveTrueAndCollectionOrderBySortOrderAscIdAsc(String collection); List<Product> findByActiveTrueAndCategoryOrderBySortOrderAscIdAsc(String category); }
