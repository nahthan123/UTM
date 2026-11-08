package vn.utm.service;

public class AuthRequiredException extends RuntimeException {
    public AuthRequiredException(String message) { super(message); }
}
