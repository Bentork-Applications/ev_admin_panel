package com.bentork.ev_system.exception.domain;

public class InvalidExcelFileException extends RuntimeException {

    public InvalidExcelFileException(String message) {
        super(message);
    }

    public InvalidExcelFileException(String message, Throwable cause) {
        super(message, cause);
    }
}
