package vn.utm.dto.response;

import vn.utm.common.enums.AccountType;
import vn.utm.model.UserAccount;

public record AuthResponse(Long id, String email, AccountType accountType, String displayName, Long profileId) {
    public static AuthResponse from(UserAccount account) {
        return new AuthResponse(account.getId(), account.getEmail(), accountType(account),
                account.displayName(), account.getOperatorProfile().getId());
    }

    private static AccountType accountType(UserAccount account) {
        try {
            Object value = account.getClass().getMethod("getAccountType").invoke(account);
            return value == null ? null : AccountType.valueOf(value.toString());
        } catch (ReflectiveOperationException e) {
            throw new IllegalStateException("Unable to read account type", e);
        }
    }
}
