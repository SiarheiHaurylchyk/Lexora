package com.lexora.repository;

import com.lexora.entity.AppNotification;
import com.lexora.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AppNotificationRepository extends JpaRepository<AppNotification, Long> {

    List<AppNotification> findTop50ByRecipientOrderByCreatedAtDesc(User recipient);

    long countByRecipientAndReadIsFalse(User recipient);

    @Modifying
    @Query("UPDATE AppNotification n SET n.read = true WHERE n.recipient = :recipient AND (n.read = false OR n.read IS NULL)")
    int markAllReadForRecipient(@Param("recipient") User recipient);
}
