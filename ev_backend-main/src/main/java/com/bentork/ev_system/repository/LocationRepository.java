package com.bentork.ev_system.repository;

import com.bentork.ev_system.model.Location;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LocationRepository extends JpaRepository<Location, Long> {
}
