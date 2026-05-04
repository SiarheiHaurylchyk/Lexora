package com.lexora.controller;

import com.lexora.dto.Dto;
import com.lexora.entity.Deck;
import com.lexora.entity.TeacherMaterialSave;
import com.lexora.entity.User;
import com.lexora.repository.CardRepository;
import com.lexora.repository.DeckRepository;
import com.lexora.repository.TeacherMaterialSaveRepository;
import com.lexora.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Community Materials catalog (teacher-published decks) and personal library bookmarks.
 */
@RestController
@RequestMapping("/api/materials")
public class MaterialsController {

    @Autowired private DeckRepository deckRepository;
    @Autowired private CardRepository cardRepository;
    @Autowired private TeacherMaterialSaveRepository saveRepository;
    @Autowired private UserRepository userRepository;

    /** Public catalog (published materials only). */
    @GetMapping("/catalog")
    @Transactional(readOnly = true)
    public ResponseEntity<?> catalog(@RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "20") int size,
                                      @RequestParam(required = false) String q,
                                      @RequestParam(defaultValue = "popular") String sort) {
        Sort s = "new".equalsIgnoreCase(sort)
                ? Sort.by(Sort.Direction.DESC, "createdAt")
                : Sort.by(Sort.Direction.DESC, "studyCount");
        PageRequest pr = PageRequest.of(page, size, s);
        Page<Deck> result;
        if (q != null && !q.trim().isEmpty()) {
            result = deckRepository.searchMaterialsCatalog(q.trim(), pr);
        } else {
            result = deckRepository.findByListedInMaterialsCatalogTrueAndVisibility(
                    Deck.Visibility.PUBLIC, pr);
        }
        return ResponseEntity.ok(result.map(d -> mapDeckLightRow(d, null)));
    }

    /** Teacher: decks you own + catalog bookmarks. Learner: only decks you own (no saves). */
    @GetMapping("/personal")
    @Transactional(readOnly = true)
    public ResponseEntity<Dto.MaterialsPersonalViewDTO> personal(Authentication auth) {
        User me = currentUser(auth);
        List<Deck> owned = deckRepository.findByOwnerOrderByUpdatedAtDesc(me);
        List<Dto.DeckResponse> ownedDto = owned.stream().map(d -> mapDeckLightRow(d, null)).collect(Collectors.toList());

        if (!me.canTeach()) {
            return ResponseEntity.ok(Dto.MaterialsPersonalViewDTO.builder()
                    .owned(ownedDto)
                    .savedFromCatalog(Collections.<Dto.DeckResponse>emptyList())
                    .build());
        }

        List<Dto.DeckResponse> saved = saveRepository.findByUserOrderByCreatedAtDesc(me).stream()
                .map(ms -> mapDeckLightRow(ms.getDeck(), ms.getId()))
                .collect(Collectors.toList());

        return ResponseEntity.ok(Dto.MaterialsPersonalViewDTO.builder()
                .owned(ownedDto)
                .savedFromCatalog(saved)
                .build());
    }

    /** Teacher: bookmark a catalog deck. */
    @PostMapping("/catalog/{deckId}/save")
    @Transactional
    public ResponseEntity<?> saveCatalogDeck(@PathVariable Long deckId, Authentication auth) {
        User me = currentUser(auth);
        if (!me.canTeach()) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Teachers only", false));
        }
        Deck deck = deckRepository.findById(deckId).orElseThrow(() -> new RuntimeException("Deck not found"));
        if (deck.getVisibility() != Deck.Visibility.PUBLIC
                || !Boolean.TRUE.equals(deck.getListedInMaterialsCatalog())) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "Only decks listed in the community catalog can be saved.", false));
        }
        if (deck.getOwner().getId().equals(me.getId())) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "You already own this deck.", false));
        }
        if (saveRepository.existsByUserAndDeck(me, deck)) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse("Already in your library.", false));
        }
        TeacherMaterialSave row = saveRepository.save(TeacherMaterialSave.builder()
                .user(me)
                .deck(deck)
                .build());
        return ResponseEntity.ok(mapDeckLightRow(deck, row.getId()));
    }

    /** Teacher: remove bookmark. */
    @DeleteMapping("/saved/{deckId}")
    @Transactional
    public ResponseEntity<?> unsave(@PathVariable Long deckId, Authentication auth) {
        User me = currentUser(auth);
        if (!me.canTeach()) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Teachers only", false));
        }
        Deck deck = deckRepository.findById(deckId).orElseThrow(() -> new RuntimeException("Deck not found"));
        saveRepository.deleteByUserAndDeck(me, deck);
        return ResponseEntity.ok(new Dto.MessageResponse("Removed from library", true));
    }

    /** Teacher: publish/unpublish deck metadata for the Materials catalog (deck must be PUBLIC when listing). */
    @PatchMapping("/my-decks/{deckId}/listing")
    @Transactional
    public ResponseEntity<?> patchListing(@PathVariable Long deckId,
                                          @RequestBody Dto.DeckCatalogListingPatchRequest req,
                                          Authentication auth) {
        User me = currentUser(auth);
        if (!me.canTeach()) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Teachers only", false));
        }
        Deck deck = deckRepository.findById(deckId).orElseThrow(() -> new RuntimeException("Deck not found"));
        if (!deck.getOwner().getId().equals(me.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }

        if (Boolean.TRUE.equals(req.listedInMaterialsCatalog) && deck.getVisibility() != Deck.Visibility.PUBLIC) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "Set the deck to PUBLIC before listing it in the catalog.", false));
        }

        if (req.listedInMaterialsCatalog != null) {
            deck.setListedInMaterialsCatalog(req.listedInMaterialsCatalog);
        }
        if (req.catalogPriceCents != null) {
            deck.setCatalogPriceCents(Math.max(0, req.catalogPriceCents));
        }
        if (req.cefrLevel != null) {
            String c = req.cefrLevel.trim();
            deck.setCefrLevel(c.isEmpty() ? null : (c.length() > 32 ? c.substring(0, 32) : c));
        }
        deck.setUpdatedAt(java.time.LocalDateTime.now());
        deckRepository.save(deck);
        return ResponseEntity.ok(mapDeckLightRow(deck, null));
    }

    private Dto.DeckResponse mapDeckLightRow(Deck deck, Long librarySaveId) {
        return Dto.DeckResponse.builder()
                .id(deck.getId())
                .title(deck.getTitle())
                .description(deck.getDescription())
                .coverColor(deck.getCoverColor())
                .emoji(deck.getEmoji())
                .sourceLanguage(deck.getSourceLanguage())
                .targetLanguage(deck.getTargetLanguage())
                .visibility(deck.getVisibility().name())
                .owner(mapOwner(deck.getOwner()))
                .cards(null)
                .cardCount((int) cardRepository.countByDeck(deck))
                .createdAt(deck.getCreatedAt())
                .updatedAt(deck.getUpdatedAt())
                .viewCount(deck.getViewCount())
                .studyCount(deck.getStudyCount())
                .listedInMaterialsCatalog(Boolean.TRUE.equals(deck.getListedInMaterialsCatalog()))
                .catalogPriceCents(deck.getCatalogPriceCents())
                .cefrLevel(deck.getCefrLevel())
                .librarySaveId(librarySaveId)
                .build();
    }

    private Dto.UserDTO mapOwner(User user) {
        return Dto.UserDTO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .displayName(user.getDisplayName())
                .avatarUrl(user.getAvatarUrl())
                .build();
    }

    private User currentUser(Authentication auth) {
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
