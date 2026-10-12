package com.bentork.ev_system.service;

import com.bentork.ev_system.dto.request.LocationDTO;
import com.bentork.ev_system.mapper.LocationMapper;
import com.bentork.ev_system.model.Admin;
import com.bentork.ev_system.model.Location;
import com.bentork.ev_system.repository.AdminRepository;
import com.bentork.ev_system.repository.LocationRepository;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationRepository locationRepo;

    private final AdminRepository adminRepo;

    @CacheEvict(value = "locations", allEntries = true)
    public Location addLocation(LocationDTO dto, Admin admin) {
        Location location = LocationMapper.toEntity(dto, admin);
        return locationRepo.save(location);
    }

    @Cacheable(value = "locations", key = "'all-location-names'")
    public List<Map<String, Object>> getAllLocationNames() {
        return locationRepo.findAll().stream()
                .map(location -> {
                    Map<String, Object> map = new HashMap<>();
                    map.put("id", location.getId());
                    map.put("name", location.getName());
                    return map;
                })
                .collect(Collectors.toList());
    }

}


