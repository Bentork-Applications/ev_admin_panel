package com.bentork.ev_system.config;

import java.time.Duration;
import java.util.HashMap;
import java.util.Map;

import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.CachingConfigurer;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.cache.interceptor.CacheErrorHandler;
import org.springframework.cache.interceptor.SimpleCacheErrorHandler;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializer;
import org.springframework.data.redis.serializer.SerializationException;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.jsontype.impl.LaissezFaireSubTypeValidator;
import com.fasterxml.jackson.annotation.JsonTypeInfo;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

import lombok.extern.slf4j.Slf4j;

/**
 * Redis Cache Configuration.
 *
 * Defines per-cache TTL settings aligned with the tiered caching strategy:
 *   T1 (Master Data)  — 30 min: plans, stations, chargers, locations, cafes
 *   T2 (Dashboard)    — 5 min:  dashboard-stats
 *   T3 (User Data)    — 10 min: user-data
 *   T4 (Reviews)      — 15 min: reviews
 *   T5 (Slots)        — 5 min:  slots
 *   RFID              — 10 min: rfid-stats
 *
 * Graceful degradation: If Redis is down, the app falls back to DB queries.
 */
@Slf4j
@Configuration
@EnableCaching
public class RedisConfig implements CachingConfigurer {

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {

        // Default cache config — fallback TTL of 10 minutes
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(10))
                .serializeKeysWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(
                        RedisSerializationContext.SerializationPair.fromSerializer(new WrapperSerializer()))
                .disableCachingNullValues();

        // Per-cache TTL overrides
        Map<String, RedisCacheConfiguration> cacheConfigs = new HashMap<>();

        // T1 — Static Master Data (30 min)
        RedisCacheConfiguration t1Config = defaultConfig.entryTtl(Duration.ofMinutes(30));
        cacheConfigs.put("plans", t1Config);
        cacheConfigs.put("stations", t1Config);
        cacheConfigs.put("chargers", t1Config);
        cacheConfigs.put("locations", t1Config);
        cacheConfigs.put("cafes", t1Config);

        // T2 — Dashboard Aggregations (5 min)
        RedisCacheConfiguration t2Config = defaultConfig.entryTtl(Duration.ofMinutes(5));
        cacheConfigs.put("dashboard-stats", t2Config);

        // T3 — User-Scoped Data (10 min)
        RedisCacheConfiguration t3Config = defaultConfig.entryTtl(Duration.ofMinutes(10));
        cacheConfigs.put("user-data", t3Config);

        // T4 — Review Data (15 min)
        RedisCacheConfiguration t4Config = defaultConfig.entryTtl(Duration.ofMinutes(15));
        cacheConfigs.put("reviews", t4Config);

        // T5 — Slot Data (5 min)
        RedisCacheConfiguration t5Config = defaultConfig.entryTtl(Duration.ofMinutes(5));
        cacheConfigs.put("slots", t5Config);

        // RFID Stats (10 min)
        RedisCacheConfiguration rfidConfig = defaultConfig.entryTtl(Duration.ofMinutes(10));
        cacheConfigs.put("rfid-stats", rfidConfig);

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigs)
                .transactionAware()
                .build();
    }

    /**
     * Custom error handler for graceful degradation.
     * When Redis is unavailable, cache operations silently fail
     * and the app falls back to direct DB queries.
     */
    @Override
    public CacheErrorHandler errorHandler() {
        return new SimpleCacheErrorHandler() {
            @Override
            public void handleCacheGetError(RuntimeException exception,
                    org.springframework.cache.Cache cache, Object key) {
                log.warn("Redis cache GET error for cache '{}', key '{}': {}. Falling back to DB.",
                        cache.getName(), key, exception.getMessage());
            }

            @Override
            public void handleCachePutError(RuntimeException exception,
                    org.springframework.cache.Cache cache, Object key, Object value) {
                log.warn("Redis cache PUT error for cache '{}', key '{}': {}",
                        cache.getName(), key, exception.getMessage());
            }

            @Override
            public void handleCacheEvictError(RuntimeException exception,
                    org.springframework.cache.Cache cache, Object key) {
                log.warn("Redis cache EVICT error for cache '{}', key '{}': {}",
                        cache.getName(), key, exception.getMessage());
            }

            @Override
            public void handleCacheClearError(RuntimeException exception,
                    org.springframework.cache.Cache cache) {
                log.warn("Redis cache CLEAR error for cache '{}': {}",
                        cache.getName(), exception.getMessage());
            }
        };
    }
}

class CacheValueWrapper {
    private Object value;

    public CacheValueWrapper() {}

    public CacheValueWrapper(Object value) {
        this.value = value;
    }

    public Object getValue() {
        return value;
    }

    public void setValue(Object value) {
        this.value = value;
    }
}

class WrapperSerializer implements RedisSerializer<Object> {
    private final GenericJackson2JsonRedisSerializer delegate;

    public WrapperSerializer() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new JavaTimeModule());
        mapper.disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
        mapper.activateDefaultTyping(
                LaissezFaireSubTypeValidator.instance,
                ObjectMapper.DefaultTyping.NON_FINAL,
                JsonTypeInfo.As.PROPERTY
        );
        this.delegate = new GenericJackson2JsonRedisSerializer(mapper);
    }

    @Override
    public byte[] serialize(Object t) throws SerializationException {
        if (t == null) {
            return new byte[0];
        }
        return delegate.serialize(new CacheValueWrapper(t));
    }

    @Override
    public Object deserialize(byte[] bytes) throws SerializationException {
        if (bytes == null || bytes.length == 0) {
            return null;
        }
        Object deserialized = delegate.deserialize(bytes);
        if (deserialized instanceof CacheValueWrapper) {
            return ((CacheValueWrapper) deserialized).getValue();
        }
        return deserialized;
    }
}

