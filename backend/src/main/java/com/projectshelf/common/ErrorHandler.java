package com.projectshelf.common;

import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.Map;

/** Uniform JSON errors: {"message": "...", "errors": {field: message}}. Never leaks stack traces or SQL. */
@RestControllerAdvice
@Slf4j
public class ErrorHandler {

    private ResponseEntity<Map<String, Object>> body(int status, String message, Map<String, String> errors) {
        Map<String, Object> b = new LinkedHashMap<>();
        b.put("message", message);
        if (errors != null) b.put("errors", errors);
        return ResponseEntity.status(status).body(b);
    }

    @ExceptionHandler(ResponseStatusException.class)
    ResponseEntity<Map<String, Object>> status(ResponseStatusException e) {
        return body(e.getStatusCode().value(), e.getReason() == null ? "Request failed" : e.getReason(), null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<Map<String, Object>> invalid(MethodArgumentNotValidException e) {
        Map<String, String> errors = new LinkedHashMap<>();
        e.getBindingResult().getFieldErrors().forEach(f -> errors.putIfAbsent(f.getField(), f.getDefaultMessage()));
        return body(400, "Please correct the highlighted fields.", errors);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class, ConstraintViolationException.class, IllegalArgumentException.class})
    ResponseEntity<Map<String, Object>> badRequest(Exception e) {
        return body(400, "Invalid request.", null);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<Map<String, Object>> conflict(DataIntegrityViolationException e) {
        return body(409, "This conflicts with existing data (duplicate or still in use).", null);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Map<String, Object>> other(Exception e) throws Exception {
        if (e instanceof AccessDeniedException || e instanceof AuthenticationException) throw e;  // handled by Spring Security
        if (e instanceof ErrorResponse er) return body(er.getStatusCode().value(), HttpStatus.valueOf(er.getStatusCode().value()).getReasonPhrase(), null);
        log.error("Unhandled error", e);
        return body(500, "Something went wrong on our side. Please try again.", null);
    }
}
