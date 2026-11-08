package vn.utm.web.dto;

import vn.utm.domain.*;

public record AuthResponse(Long id, String email, AccountType accountType, String displayName, Long profileId) {
    public static AuthResponse from(UserAccount account) {
        return new AuthResponse(account.getId(), account.getEmail(), account.getAccountType(),
                account.displayName(), account.getOperatorProfile().getId());
    }
}
