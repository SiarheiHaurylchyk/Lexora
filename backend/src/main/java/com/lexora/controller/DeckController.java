package com.lexora.controller;

import com.lexora.dto.Dto;
import com.lexora.entity.Card;
import com.lexora.entity.Deck;
import com.lexora.entity.DeckShare;
import com.lexora.entity.TeacherStudent;
import com.lexora.entity.User;
import com.lexora.repository.CardRepository;
import com.lexora.repository.DeckRepository;
import com.lexora.repository.DeckShareRepository;
import com.lexora.repository.TeacherStudentRepository;
import com.lexora.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/decks")
public class DeckController {

    @Autowired private DeckRepository deckRepository;
    @Autowired private CardRepository cardRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private DeckShareRepository deckShareRepository;
    @Autowired private TeacherStudentRepository teacherStudentRepository;

    @GetMapping("/my")
    public ResponseEntity<?> getMyDecks(Authentication auth) {
        User user = getUser(auth);
        List<Deck> decks = deckRepository.findByOwnerOrderByUpdatedAtDesc(user);
        return ResponseEntity.ok(decks.stream().map(this::mapToResponse).collect(Collectors.toList()));
    }

    /** GET /api/decks/shared — list of decks that other people shared with the current user. */
    @GetMapping("/shared")
    @Transactional(readOnly = true)
    public ResponseEntity<?> getSharedWithMe(Authentication auth) {
        User user = getUser(auth);
        List<Deck> shared = deckShareRepository.findByUserOrderByCreatedAtDesc(user).stream()
                .map(DeckShare::getDeck)
                .collect(Collectors.toList());
        return ResponseEntity.ok(shared.stream()
                .map(this::mapToResponseLight)
                .collect(Collectors.toList()));
    }

    @GetMapping("/public")
    public ResponseEntity<?> getPublicDecks(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Page<Deck> decks = deckRepository.findByVisibility(
            Deck.Visibility.PUBLIC,
            PageRequest.of(page, size, Sort.by("studyCount").descending())
        );
        return ResponseEntity.ok(decks.map(this::mapToResponseLight));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getDeck(@PathVariable Long id, Authentication auth) {
        Deck deck = deckRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Deck not found"));

        if (deck.getVisibility() == Deck.Visibility.PRIVATE && auth != null) {
            User user = getUser(auth);
            boolean isOwner = deck.getOwner().getId().equals(user.getId());
            boolean isShared = deckShareRepository.existsByDeckAndUser(deck, user);
            if (!isOwner && !isShared) {
                return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
            }
        }
        return ResponseEntity.ok(mapToResponse(deck));
    }

    @PostMapping
    public ResponseEntity<?> createDeck(@Valid @RequestBody Dto.DeckRequest request, Authentication auth) {
        User user = getUser(auth);
        Deck deck = Deck.builder()
                .title(request.title)
                .description(request.description)
                .coverColor(request.coverColor != null ? request.coverColor : "#6C63FF")
                .emoji(request.emoji != null ? request.emoji : "📚")
                .sourceLanguage(request.sourceLanguage)
                .targetLanguage(request.targetLanguage)
                .visibility(request.visibility != null ?
                    Deck.Visibility.valueOf(request.visibility) : Deck.Visibility.PRIVATE)
                .owner(user)
                .updatedAt(LocalDateTime.now())
                .viewCount(0)
                .studyCount(0)
                .build();
        return ResponseEntity.ok(mapToResponse(deckRepository.save(deck)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateDeck(@PathVariable Long id,
                                         @Valid @RequestBody Dto.DeckRequest request,
                                         Authentication auth) {
        Deck deck = deckRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Deck not found"));
        User user = getUser(auth);

        if (!deck.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }

        deck.setTitle(request.title);
        deck.setDescription(request.description);
        if (request.coverColor != null) deck.setCoverColor(request.coverColor);
        if (request.emoji != null) deck.setEmoji(request.emoji);
        deck.setSourceLanguage(request.sourceLanguage);
        deck.setTargetLanguage(request.targetLanguage);
        if (request.visibility != null) deck.setVisibility(Deck.Visibility.valueOf(request.visibility));
        deck.setUpdatedAt(LocalDateTime.now());

        return ResponseEntity.ok(mapToResponse(deckRepository.save(deck)));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteDeck(@PathVariable Long id, Authentication auth) {
        Deck deck = deckRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Deck not found"));
        User user = getUser(auth);

        if (!deck.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }

        deckRepository.delete(deck);
        return ResponseEntity.ok(new Dto.MessageResponse("Deck deleted", true));
    }

    // Card endpoints nested under deck
    @PostMapping("/{id}/cards")
    public ResponseEntity<?> addCard(@PathVariable Long id,
                                      @Valid @RequestBody Dto.CardRequest request,
                                      Authentication auth) {
        Deck deck = deckRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Deck not found"));
        User user = getUser(auth);

        if (!deck.getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }

        Card card = Card.builder()
                .term(request.term)
                .definition(request.definition)
                .example(request.example)
                .transcription(request.transcription)
                .termImageUrl(request.termImageUrl)
                .definitionImageUrl(request.definitionImageUrl)
                .sortOrder(request.sortOrder != null ? request.sortOrder : (int) cardRepository.countByDeck(deck))
                .deck(deck)
                .build();

        deck.setUpdatedAt(LocalDateTime.now());
        deckRepository.save(deck);

        return ResponseEntity.ok(mapCardToResponse(cardRepository.save(card)));
    }

    @PutMapping("/{deckId}/cards/{cardId}")
    public ResponseEntity<?> updateCard(@PathVariable Long deckId,
                                         @PathVariable Long cardId,
                                         @Valid @RequestBody Dto.CardRequest request,
                                         Authentication auth) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        User user = getUser(auth);

        if (!card.getDeck().getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }

        card.setTerm(request.term);
        card.setDefinition(request.definition);
        card.setExample(request.example);
        card.setTranscription(request.transcription);
        card.setTermImageUrl(request.termImageUrl);
        card.setDefinitionImageUrl(request.definitionImageUrl);
        if (request.sortOrder != null) card.setSortOrder(request.sortOrder);

        return ResponseEntity.ok(mapCardToResponse(cardRepository.save(card)));
    }

    @DeleteMapping("/{deckId}/cards/{cardId}")
    public ResponseEntity<?> deleteCard(@PathVariable Long deckId,
                                         @PathVariable Long cardId,
                                         Authentication auth) {
        Card card = cardRepository.findById(cardId)
                .orElseThrow(() -> new RuntimeException("Card not found"));
        User user = getUser(auth);

        if (!card.getDeck().getOwner().getId().equals(user.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }

        cardRepository.delete(card);
        return ResponseEntity.ok(new Dto.MessageResponse("Card deleted", true));
    }

    /* ============= Deck sharing (teacher -> student) ============= */

    /** GET /api/decks/{id}/shares — list users this deck is shared with. Owner only. */
    @GetMapping("/{id}/shares")
    @Transactional(readOnly = true)
    public ResponseEntity<?> listShares(@PathVariable Long id, Authentication auth) {
        Deck deck = deckRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Deck not found"));
        User me = getUser(auth);
        if (!me.canTeach()) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse(
                    "Teacher accounts only", false));
        }
        if (!deck.getOwner().getId().equals(me.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        List<Dto.DeckShareResponse> list = deckShareRepository.findByDeck(deck).stream()
                .map(this::toShareResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(list);
    }

    /** POST /api/decks/{id}/share — share this deck with a user found by email. Owner only. */
    @PostMapping("/{id}/share")
    @Transactional
    public ResponseEntity<?> shareWithEmail(@PathVariable Long id,
                                             @Valid @RequestBody Dto.ShareDeckRequest req,
                                             Authentication auth) {
        Deck deck = deckRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Deck not found"));
        User me = getUser(auth);
        if (!me.canTeach()) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse(
                    "Teacher accounts only", false));
        }
        if (!deck.getOwner().getId().equals(me.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }

        User recipient = userRepository.findByEmail(req.email).orElse(null);
        if (recipient == null) {
            return ResponseEntity.status(404).body(new Dto.MessageResponse(
                    "No user with this email. Ask them to sign up first.", false));
        }
        if (recipient.getId().equals(me.getId())) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "You already own this deck.", false));
        }
        if (deckShareRepository.existsByDeckAndUser(deck, recipient)) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "Deck is already shared with this user.", false));
        }

        DeckShare share = deckShareRepository.save(DeckShare.builder()
                .deck(deck)
                .user(recipient)
                .sharedBy(me)
                .build());

        return ResponseEntity.ok(toShareResponse(share));
    }

    /**
     * Share a deck with the student on a teacher–student link.
     * Allowed when you own the deck, or when it is a PUBLIC catalog listing (community material).
     */
    @PostMapping("/{deckId}/share-with-link")
    @Transactional
    public ResponseEntity<?> shareWithLinkedStudent(@PathVariable Long deckId,
                                                     @Valid @RequestBody Dto.ShareDeckWithLinkRequest req,
                                                     Authentication auth) {
        Deck deck = deckRepository.findById(deckId)
                .orElseThrow(() -> new RuntimeException("Deck not found"));
        User me = getUser(auth);
        if (!me.canTeach()) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Teachers only", false));
        }
        TeacherStudent link = teacherStudentRepository.findById(req.linkId)
                .orElseThrow(() -> new RuntimeException("Class link not found"));
        if (!link.getTeacher().getId().equals(me.getId())) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        User student = link.getStudent();
        boolean owned = deck.getOwner().getId().equals(me.getId());
        boolean communityShare = deck.getVisibility() == Deck.Visibility.PUBLIC
                && Boolean.TRUE.equals(deck.getListedInMaterialsCatalog());
        if (!owned && !communityShare) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse(
                    "You can share only your own decks or public catalog materials.", false));
        }
        if (deckShareRepository.existsByDeckAndUser(deck, student)) {
            return ResponseEntity.badRequest().body(new Dto.MessageResponse(
                    "This deck is already shared with this student.", false));
        }
        DeckShare share = deckShareRepository.save(DeckShare.builder()
                .deck(deck)
                .user(student)
                .sharedBy(me)
                .build());
        return ResponseEntity.ok(toShareResponse(share));
    }

    /** DELETE /api/decks/{id}/share/{shareId} — stop sharing with a user. Deck owner or the teacher who created the share. */
    @DeleteMapping("/{id}/share/{shareId}")
    @Transactional
    public ResponseEntity<?> removeShare(@PathVariable Long id,
                                          @PathVariable Long shareId,
                                          Authentication auth) {
        Deck deck = deckRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Deck not found"));
        User me = getUser(auth);
        if (!me.canTeach()) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse(
                    "Teacher accounts only", false));
        }
        DeckShare share = deckShareRepository.findById(shareId)
                .orElseThrow(() -> new RuntimeException("Share not found"));
        if (!share.getDeck().getId().equals(deck.getId())) {
            return ResponseEntity.status(400).body(new Dto.MessageResponse("Wrong deck", false));
        }
        boolean isOwner = deck.getOwner().getId().equals(me.getId());
        boolean isSharer = share.getSharedBy() != null && share.getSharedBy().getId().equals(me.getId());
        if (!isOwner && !isSharer) {
            return ResponseEntity.status(403).body(new Dto.MessageResponse("Access denied", false));
        }
        deckShareRepository.delete(share);
        return ResponseEntity.ok(new Dto.MessageResponse("Share removed", true));
    }

    private Dto.DeckShareResponse toShareResponse(DeckShare share) {
        User u = share.getUser();
        return Dto.DeckShareResponse.builder()
                .shareId(share.getId())
                .createdAt(share.getCreatedAt())
                .user(Dto.UserDTO.builder()
                        .id(u.getId())
                        .username(u.getUsername())
                        .email(u.getEmail())
                        .displayName(u.getDisplayName())
                        .avatarUrl(u.getAvatarUrl())
                        .role(u.getRole() != null ? u.getRole().name() : "USER")
                        .createdAt(u.getCreatedAt())
                        .build())
                .build();
    }

    @GetMapping("/search")
    public ResponseEntity<?> search(@RequestParam String q,
                                     @RequestParam(defaultValue = "0") int page,
                                     @RequestParam(defaultValue = "20") int size) {
        Page<Deck> results = deckRepository.searchPublic(q, PageRequest.of(page, size));
        return ResponseEntity.ok(results.map(this::mapToResponseLight));
    }

    // Helper mappers
    private Dto.DeckResponse mapToResponse(Deck deck) {
        List<Card> cards = cardRepository.findByDeckOrderBySortOrder(deck);
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
                .cards(cards.stream().map(this::mapCardToResponse).collect(Collectors.toList()))
                .cardCount(cards.size())
                .createdAt(deck.getCreatedAt())
                .updatedAt(deck.getUpdatedAt())
                .viewCount(deck.getViewCount())
                .studyCount(deck.getStudyCount())
                .listedInMaterialsCatalog(Boolean.TRUE.equals(deck.getListedInMaterialsCatalog()))
                .catalogPriceCents(deck.getCatalogPriceCents())
                .cefrLevel(deck.getCefrLevel())
                .librarySaveId(null)
                .build();
    }

    private Dto.DeckResponse mapToResponseLight(Deck deck) {
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
                .cardCount((int) cardRepository.countByDeck(deck))
                .createdAt(deck.getCreatedAt())
                .updatedAt(deck.getUpdatedAt())
                .viewCount(deck.getViewCount())
                .studyCount(deck.getStudyCount())
                .listedInMaterialsCatalog(Boolean.TRUE.equals(deck.getListedInMaterialsCatalog()))
                .catalogPriceCents(deck.getCatalogPriceCents())
                .cefrLevel(deck.getCefrLevel())
                .librarySaveId(null)
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

    private Dto.CardResponse mapCardToResponse(Card card) {
        return Dto.CardResponse.builder()
                .id(card.getId())
                .term(card.getTerm())
                .definition(card.getDefinition())
                .example(card.getExample())
                .transcription(card.getTranscription())
                .termImageUrl(card.getTermImageUrl())
                .definitionImageUrl(card.getDefinitionImageUrl())
                .sortOrder(card.getSortOrder())
                .build();
    }

    private User getUser(Authentication auth) {
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
}
