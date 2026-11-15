package vn.utm.repository;
import vn.utm.model.UserAccount;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface UserAccountRepository extends JpaRepository<UserAccount, UUID>, JpaSpecificationExecutor<UserAccount> {
    Optional<UserAccount> findByUsernameIgnoreCase(String username);
    Optional<UserAccount> findByEmailIgnoreCase(String email);
    Optional<UserAccount> findByTaxCodeIgnoreCase(String taxCode);
}
