package com.bentork.ev_system.exception.domain;

import com.bentork.ev_system.util.PiiMaskingUtil;

public class UserNotFoundException extends RuntimeException {

    public UserNotFoundException(Long userId) {
        super("User not found with ID: " + userId);
    }

    public UserNotFoundException(String email) {
        super("User not found with email: " + PiiMaskingUtil.maskEmail(email));
    }
}
