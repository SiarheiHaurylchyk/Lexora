package com.lexora.repository;

import com.lexora.entity.Deck;
import com.lexora.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DeckRepository extends JpaRepository<Deck, Long> {
    List<Deck> findByOwnerOrderByUpdatedAtDesc(User owner);
    Page<Deck> findByVisibility(Deck.Visibility visibility, Pageable pageable);

    Page<Deck> findByListedInMaterialsCatalogTrueAndVisibility(
            Deck.Visibility visibility, Pageable pageable);

    @Query("SELECT d FROM Deck d WHERE d.listedInMaterialsCatalog = true AND d.visibility = :visibility "
            + "AND d.cefrLevel = :cefr")
    Page<Deck> findCatalogByCefr(@Param("visibility") Deck.Visibility visibility,
                                 @Param("cefr") String cefr,
                                 Pageable pageable);

    @Query("SELECT d FROM Deck d WHERE d.listedInMaterialsCatalog = true AND d.visibility = :visibility "
            + "AND (d.cefrLevel IS NULL OR TRIM(d.cefrLevel) = '')")
    Page<Deck> findCatalogWithoutCefr(@Param("visibility") Deck.Visibility visibility,
                                      Pageable pageable);

    @Query("SELECT d FROM Deck d WHERE d.listedInMaterialsCatalog = true AND d.visibility = 'PUBLIC' AND "
            + "(LOWER(d.title) LIKE LOWER(CONCAT('%', :q, '%')) OR "
            + "LOWER(d.description) LIKE LOWER(CONCAT('%', :q, '%')))")
    Page<Deck> searchMaterialsCatalog(@Param("q") String q, Pageable pageable);

    @Query("SELECT d FROM Deck d WHERE d.visibility = 'PUBLIC' AND " +
           "(LOWER(d.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(d.description) LIKE LOWER(CONCAT('%', :query, '%')))")
    Page<Deck> searchPublic(@Param("query") String query, Pageable pageable);

    @Query("SELECT d FROM Deck d WHERE d.owner = :owner AND " +
           "(LOWER(d.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(d.description) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<Deck> searchByOwner(@Param("owner") User owner, @Param("query") String query);

    long countByOwner(User owner);

    long countByOwnerAndVisibility(User owner, Deck.Visibility visibility);
}
