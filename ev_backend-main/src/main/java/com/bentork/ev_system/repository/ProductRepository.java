package com.bentork.ev_system.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.bentork.ev_system.model.Product;

@Repository
public interface ProductRepository extends JpaRepository<Product, Long> {

    List<Product> findByActiveTrue();

    List<Product> findByActiveTrueOrderByNameAsc();

    List<Product> findByCategoryAndActiveTrue(String category);

    List<Product> findAllByOrderByCreatedAtDesc();

    boolean existsByNameAndModelNumber(String name, String modelNumber);
    
    java.util.Optional<Product> findByBarcode(String barcode);
}
