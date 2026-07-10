package com.bentork.ev_system.service;

import com.bentork.ev_system.model.User;
import com.bentork.ev_system.model.Plan;
import com.bentork.ev_system.service.interfaces.IWalletTransactionService;
import com.bentork.ev_system.service.interfaces.IAdminNotificationService;
import com.bentork.ev_system.service.interfaces.IUserNotificationService;
import com.bentork.ev_system.service.interfaces.IReceiptService;
import com.bentork.ev_system.service.interfaces.IChargerCommandService;
import com.bentork.ev_system.service.interfaces.ISessionFinalizationService;
import com.bentork.ev_system.service.interfaces.ISessionQueryService;
import com.bentork.ev_system.service.interfaces.IMaintenanceService;
import com.bentork.ev_system.exception.domain.StationUnderMaintenanceException;
import com.bentork.ev_system.dto.request.SessionDTO;
import com.bentork.ev_system.exception.ChargerBusyException;
import com.bentork.ev_system.exception.domain.ChargerNotFoundException;
import com.bentork.ev_system.exception.domain.ChargerOfflineException;
import com.bentork.ev_system.exception.domain.InvalidReceiptStateException;
import com.bentork.ev_system.exception.domain.SessionNotFoundException;
import com.bentork.ev_system.exception.domain.UnauthorizedSessionAccessException;
import com.bentork.ev_system.model.Charger;
import com.bentork.ev_system.model.Receipt;
import com.bentork.ev_system.model.Session;
import com.bentork.ev_system.enums.SessionStatus;
import com.bentork.ev_system.repository.ChargerRepository;
import com.bentork.ev_system.repository.ReceiptRepository;
import com.bentork.ev_system.repository.SessionRepository;

import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import com.bentork.ev_system.service.interfaces.ISessionService;

/**
 * Session lifecycle management — start, stop, activate, schedule.
 * Delegates finalization to ISessionFinalizationService,
 * charger commands to IChargerCommandService,
 * and queries to ISessionQueryService.
 *
 * After Phase 5 decomposition: ~300 lines (down from ~878).
 */
@Slf4j
@Service
public class SessionService implements ISessionService {

	private final SessionRepository sessionRepository;
	private final ReceiptRepository receiptRepository;
	private final ChargerRepository chargerRepository;
	private final com.bentork.ev_system.repository.UserRepository userRepository;
	private final com.bentork.ev_system.repository.PlanRepository planRepository;
	private final IReceiptService receiptService;
	private final IWalletTransactionService walletTransactionService;
	private final IAdminNotificationService adminNotificationService;
	private final IUserNotificationService userNotificationService;
	private final IChargerCommandService chargerCommandService;
	private final ISessionFinalizationService sessionFinalizationService;
	private final ISessionQueryService sessionQueryService;
	private final IMaintenanceService maintenanceService;
	private final StaleSessionCleanupService staleSessionCleanupService;
	private final SessionReminderService sessionReminderService;
	private final MoneyCalculationService moneyCalculationService;
	private final SlotBookingService slotBookingService;

	private final ScheduledExecutorService scheduler = Executors.newScheduledThreadPool(15);

	public SessionService(
			SessionRepository sessionRepository,
			ReceiptRepository receiptRepository,
			ChargerRepository chargerRepository,
			com.bentork.ev_system.repository.UserRepository userRepository,
			com.bentork.ev_system.repository.PlanRepository planRepository,
			IReceiptService receiptService,
			IWalletTransactionService walletTransactionService,
			IAdminNotificationService adminNotificationService,
			IUserNotificationService userNotificationService,
			IChargerCommandService chargerCommandService,
			ISessionFinalizationService sessionFinalizationService,
			ISessionQueryService sessionQueryService,
			IMaintenanceService maintenanceService,
			StaleSessionCleanupService staleSessionCleanupService,
			SessionReminderService sessionReminderService,
			MoneyCalculationService moneyCalculationService,
			SlotBookingService slotBookingService) {
		this.sessionRepository = sessionRepository;
		this.receiptRepository = receiptRepository;
		this.chargerRepository = chargerRepository;
		this.userRepository = userRepository;
		this.planRepository = planRepository;
		this.receiptService = receiptService;
		this.walletTransactionService = walletTransactionService;
		this.adminNotificationService = adminNotificationService;
		this.userNotificationService = userNotificationService;
		this.chargerCommandService = chargerCommandService;
		this.sessionFinalizationService = sessionFinalizationService;
		this.sessionQueryService = sessionQueryService;
		this.maintenanceService = maintenanceService;
		this.staleSessionCleanupService = staleSessionCleanupService;
		this.sessionReminderService = sessionReminderService;
		this.moneyCalculationService = moneyCalculationService;
		this.slotBookingService = slotBookingService;
	}

	// ===================== LIFECYCLE METHODS =====================

	@Transactional
	public Map<String, Object> startSession(String email, SessionDTO request) {
		log.info("Starting session for user: {}, chargerId={}, amountEntered={}, selectedKwh={}",
				email, request.getChargerId(), request.getAmountEntered(), request.getSelectedKwh());

		User user = userRepository.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("User not found"));

		Charger charger = chargerRepository.findById(request.getChargerId())
				.orElseThrow(() -> new RuntimeException("Charger not found"));

		Receipt receipt;
		if (request.getAmountEntered() != null) {
			MoneyCalculationService.MoneyCalculationResult calc = moneyCalculationService.calculate(
					request.getAmountEntered(),
					BigDecimal.valueOf(charger.getRate()),
					BigDecimal.valueOf(charger.getPstPercent() != null ? charger.getPstPercent() : 0.0),
					BigDecimal.valueOf(charger.getPlatformFeePerKwh() != null ? charger.getPlatformFeePerKwh() : 0.0)
			);
			receipt = receiptService.createMoneyBasedReceipt(user, charger, request.getAmountEntered(), calc);
		} else {
			receipt = receiptService.createReceipt(user, charger, request.getSelectedKwh());
		}

		Receipt paidReceipt = receiptService.payReceipt(receipt.getId(), request.getBoxId());
		Session session = paidReceipt.getSession();

		if (request.getAmountEntered() != null) {
			MoneyCalculationService.MoneyCalculationResult calc = moneyCalculationService.calculate(
					request.getAmountEntered(),
					BigDecimal.valueOf(charger.getRate()),
					BigDecimal.valueOf(charger.getPstPercent() != null ? charger.getPstPercent() : 0.0),
					BigDecimal.valueOf(charger.getPlatformFeePerKwh() != null ? charger.getPlatformFeePerKwh() : 0.0)
			);
			
			// Instant refund of remainder
			if (calc.getRefundAmount().compareTo(BigDecimal.ZERO) > 0) {
				walletTransactionService.credit(user.getId(), session.getId(),
						calc.getRefundAmount(), "MONEY_BASED instant refund - remainder");
			}

			// Populate audit fields
			session.setAmountEntered(calc.getAmountEntered());
			session.setEffectiveRateApplied(calc.getEffectiveRate());
			session.setAllocatedKwh(calc.getAllocatedKwh());
			session.setChargeableAmount(calc.getChargeableAmount());
			session.setRefundAmount(calc.getRefundAmount());
			session.setRefundStatus("INSTANT_REFUNDED");
			sessionRepository.save(session);
		}

		return Map.of(
				"receiptId", paidReceipt.getId(),
				"sessionId", session.getId(),
				"amountDebited", paidReceipt.getAmount(),
				"message", "Session started successfully.");
	}

	public Map<String, Object> stopSession(String email, SessionDTO request) {
		log.info("Stopping session for user: {}, sessionId={}", email, request.getSessionId());

		User user = userRepository.findByEmail(email)
				.orElseThrow(() -> new RuntimeException("User not found"));

		return stopSession(user.getId(), request);
	}

	/**
	 * Start session only if receipt is already PAID.
	 * Sends RemoteStartTransaction to physical charger via IChargerCommandService.
	 *
	 * Uses pessimistic locking (SELECT ... FOR UPDATE) on the charger row
	 * to prevent race conditions when multiple users try to start a session
	 * on the same charger simultaneously.
	 */
	@Transactional
	public Session startSessionFromReceipt(Receipt receipt, String boxId) {
		try {
			log.info("Starting session from receipt: receiptId={}, userId={}, chargerId={}",
					receipt.getId(), receipt.getUser().getId(), receipt.getCharger().getId());

			if (!"PAID".equalsIgnoreCase(receipt.getStatus())) {
				log.warn("Cannot start session - Receipt not paid: receiptId={}, status={}",
						receipt.getId(), receipt.getStatus());
				throw new InvalidReceiptStateException(receipt.getId(), "PAID");
			}

			// ★ LOCK: Acquire pessimistic lock on charger row
			Charger lockedCharger = chargerRepository.findByIdForUpdate(receipt.getCharger().getId())
					.orElseThrow(() -> new ChargerNotFoundException(receipt.getCharger().getId()));

			// ★ MAINTENANCE GUARD: Block session if charger/station is under active maintenance
			if (maintenanceService.isChargerUnderMaintenance(lockedCharger.getId())) {
				log.warn("Cannot start session — charger {} is under maintenance", lockedCharger.getId());
				throw new StationUnderMaintenanceException(lockedCharger.getId(), "charger");
			}

			// ★ SLOT BOOKING GUARD: Block session if charger is reserved by another user
			slotBookingService.validateAndHandleBooking(receipt.getUser().getId(), lockedCharger.getId());

			// Check if charger already has an active or initiated session
			List<String> activeStatuses = List.of(
					SessionStatus.ACTIVE.getValue(),
					SessionStatus.INITIATED.getValue());
			Optional<Session> busySession = sessionRepository.findFirstByChargerAndStatusInOrderByCreatedAtDesc(
					lockedCharger, activeStatuses);

			if (busySession.isPresent()) {
				Session dangling = busySession.get();
				if ("Available".equalsIgnoreCase(lockedCharger.getStatus())) {
					log.warn("Charger {} is AVAILABLE but has dangling session {}. Auto-cleaning...", lockedCharger.getId(), dangling.getId());
					if (SessionStatus.ACTIVE.matches(dangling.getStatus())) {
						sessionFinalizationService.finalizeSession(dangling, "Auto-closed: Charger became available");
					} else if (SessionStatus.INITIATED.matches(dangling.getStatus())) {
						staleSessionCleanupService.failStaleSession(dangling);
					}
					// Dangling session resolved, safe to proceed and create the new session.
				} else {
					log.warn("Charger {} is busy with session {}", lockedCharger.getId(), dangling.getId());
					throw new ChargerBusyException(lockedCharger.getId());
				}
			}

			// Now safe to create session
			Session session = new Session();
			session.setUser(receipt.getUser());
			session.setCharger(lockedCharger);
			session.setBoxId(boxId);
			session.setStartTime(LocalDateTime.now());
			session.setStatus(SessionStatus.INITIATED.getValue());
			session.setCreatedAt(LocalDateTime.now());
			session.setSourceType("SESSION");
			sessionRepository.save(session);

			// Link receipt to session
			receipt.setSession(session);
			receiptRepository.save(receipt);

			log.info("Session created in DB: sessionId={}, status=INITIATED", session.getId());

			// ★ FIX: Send RemoteStartTransaction AFTER the DB transaction commits
			// This prevents the race condition where the charger responds before
			// the session is visible in the database to the WebSocket thread.
			final Long sessionId = session.getId();
			final Long userId = session.getUser().getId();
			final Long chargerId = receipt.getCharger().getId();
			final BigDecimal receiptAmount = receipt.getAmount();

			org.springframework.transaction.support.TransactionSynchronizationManager
					.registerSynchronization(
							new org.springframework.transaction.support.TransactionSynchronization() {
								@Override
								public void afterCommit() {
									try {
										Session s = sessionRepository.findById(sessionId).orElse(null);
										if (s == null || !SessionStatus.INITIATED.matches(s.getStatus())) {
											log.warn("Session {} not found or no longer INITIATED after commit", sessionId);
											return;
										}

										boolean sent = chargerCommandService.sendRemoteStart(s);
										if (sent) {
											userNotificationService.createNotification(
													userId,
													"Charging Command Sent",
													"Start command sent to charger. Please ensure cable is connected.",
													"INFO");
										} else {
											log.warn("Charger offline after commit for sessionId={}", sessionId);
											// Mark session failed and refund
											s.setStatus(SessionStatus.FAILED.getValue());
											s.setEndTime(LocalDateTime.now());
											sessionRepository.save(s);

											if (receiptAmount != null && receiptAmount.compareTo(BigDecimal.ZERO) > 0) {
												scheduler.submit(() -> {
													try {
														walletTransactionService.credit(userId, sessionId, receiptAmount,
																"Refund: Charger Offline");
													} catch (Exception e) {
														log.error("Failed to process offline refund for sessionId={}: {}", sessionId, e.getMessage());
													}
												});
											}
											userNotificationService.createNotification(userId,
													"Charger Offline",
													"Cannot start charging - charger is offline. Amount refunded.",
													"ERROR");
										}
									} catch (Exception e) {
										log.error("Post-commit RemoteStart failed for session {}: {}",
												sessionId, e.getMessage(), e);
									}
								}
							});

			// Schedule auto-stop (kWh-based fallback)
			if (receipt.getSelectedKwh() != null) {
				int safetyBufferMinutes = 24 * 60;
				log.info("Scheduling safety fallback for session: sessionId={}, selectedKwh={}, safetyTimeout={} mins",
						session.getId(), receipt.getSelectedKwh(), safetyBufferMinutes);
				scheduleAutoStop(session.getId(), safetyBufferMinutes);
			}

			adminNotificationService.createSystemNotification(
					"User '" + session.getUser().getName() + "' initiated session on charger '" +
							session.getCharger().getOcppId() + "'",
					"SESSION_INITIATED");

			return session;

		} catch (Exception e) {
			log.error("Failed to start session from receipt: receiptId={}: {}",
					receipt.getId(), e.getMessage(), e);
			throw e;
		}
	}

	/**
	 * Manual stop (by user) - Also sends RemoteStopTransaction to charger.
	 * Handles both ACTIVE sessions (normal stop) and INITIATED sessions
	 * (charger firmware didn't respond — cancel and refund).
	 */
	public Map<String, Object> stopSession(Long userId, SessionDTO request) {
		try {
			log.info("Manual stop requested: sessionId={}, userId={}", request.getSessionId(), userId);

			Session session = sessionRepository.findById(request.getSessionId())
					.orElseThrow(() -> new SessionNotFoundException(request.getSessionId()));

			if (!session.getUser().getId().equals(userId)) {
				log.warn("Unauthorized stop attempt: sessionId={}, requestedBy={}, owner={}",
						request.getSessionId(), userId, session.getUser().getId());
				throw new UnauthorizedSessionAccessException(userId, request.getSessionId());
			}

			// ★ Handle INITIATED sessions: charger firmware didn't respond with StartTransaction
			// The user should be able to cancel these — fail the session and refund.
			if (SessionStatus.INITIATED.matches(session.getStatus())) {
				log.info("Cancelling INITIATED session (charger did not respond): sessionId={}", request.getSessionId());

				// Send RemoteStop just in case the charger did start physically
				chargerCommandService.sendRemoteStop(session);

				// Fail the session and refund via stale session cleanup logic
				staleSessionCleanupService.failStaleSession(session);

				return Map.of(
						"sessionId", session.getId(),
						"energyUsed", 0.0,
						"finalCost", BigDecimal.ZERO,
						"message", "Session cancelled — charger did not respond. Amount refunded to wallet.");
			}

			// ★ Handle already-ended sessions (completed or failed)
			if (SessionStatus.isEndedStatus(session.getStatus())) {
				log.info("Session already ended: sessionId={}, status={}",
						request.getSessionId(), session.getStatus());
				return sessionFinalizationService.buildAlreadyCompletedResponse(session);
			}

			// ★ Handle ACTIVE sessions: normal stop flow
			// Send RemoteStopTransaction via ChargerCommandService
			chargerCommandService.sendRemoteStop(session);

			return sessionFinalizationService.finalizeSession(session, "Manual Stop");

		} catch (Exception e) {
			log.error("Failed to stop session: sessionId={}, userId={}: {}",
					request.getSessionId(), userId, e.getMessage(), e);
			throw e;
		}
	}

	/**
	 * Auto-stop (triggered by scheduler).
	 */
	public void stopSessionBySystem(Long sessionId) {
		try {
			log.info("Auto-stop triggered by system: sessionId={}", sessionId);

			Session session = sessionRepository.findById(sessionId)
					.orElseThrow(() -> new SessionNotFoundException(sessionId));

			if (SessionStatus.ACTIVE.matches(session.getStatus())) {
				chargerCommandService.sendRemoteStop(session);
				sessionFinalizationService.finalizeSession(session, "Auto Stop");
			} else {
				log.info("Session already inactive, skipping auto-stop: sessionId={}, status={}",
						sessionId, session.getStatus());
			}
		} catch (Exception e) {
			log.error("Failed to auto-stop session: sessionId={}: {}", sessionId, e.getMessage(), e);
			throw e;
		}
	}

	/**
	 * Real-time check for selectedKwh session — stop when limit reached.
	 */
	public void checkAndStopIfReachedKwh(Long sessionId, double currentKwh) {
		try {
			Session session = sessionRepository.findById(sessionId)
					.orElseThrow(() -> new SessionNotFoundException(sessionId));

			Receipt receipt = receiptRepository.findBySession(session).orElse(null);
			if (receipt != null && receipt.getSelectedKwh() != null &&
					SessionStatus.ACTIVE.matches(session.getStatus())) {
				double targetKwh = receipt.getSelectedKwh().doubleValue();

				if (log.isDebugEnabled()) {
					log.debug("Checking kWh limit: sessionId={}, currentKwh={}, targetKwh={}",
							sessionId, currentKwh, targetKwh);
				}

				if (currentKwh >= targetKwh) {
					log.info("kWh limit reached, stopping session: sessionId={}, currentKwh={}, targetKwh={}",
							sessionId, currentKwh, targetKwh);

					chargerCommandService.sendRemoteStop(session);
					sessionFinalizationService.finalizeSession(session, "Auto stop kwh reached");
				}
			}
		} catch (Exception e) {
			log.error("Failed to check kWh limit: sessionId={}, currentKwh={}: {}",
					sessionId, currentKwh, e.getMessage(), e);
			throw e;
		}
	}

	/**
	 * Activate an existing INITIATED session under a pessimistic lock.
	 */
	@Transactional
	public Session activateOrRejectSession(String ocppId) {
		try {
			Charger lockedCharger = chargerRepository.findByOcppIdForUpdate(ocppId)
					.orElseThrow(() -> new ChargerNotFoundException(ocppId));

			List<String> activeStatuses = List.of(
					SessionStatus.INITIATED.getValue(),
					SessionStatus.ACTIVE.getValue());

			Session session = sessionRepository
					.findFirstByChargerAndStatusInOrderByCreatedAtDesc(lockedCharger, activeStatuses)
					.orElse(null);

			if (session != null && SessionStatus.INITIATED.matches(session.getStatus())) {
				session.setStatus(SessionStatus.ACTIVE.getValue());
				session.setStartTime(LocalDateTime.now());
				sessionRepository.save(session);
				log.info("Session {} activated under lock for charger {}", session.getId(), ocppId);
			}

			return session;
		} catch (Exception e) {
			log.error("Error in activateOrRejectSession for charger {}: {}", ocppId, e.getMessage(), e);
			throw e;
		}
	}

	// ===================== DELEGATION TO QUERY SERVICE =====================

	public Session getSessionById(Long sessionId) {
		return sessionQueryService.getSessionById(sessionId);
	}

	public long getTotalSessions() {
		return sessionQueryService.getTotalSessions();
	}

	public double getTotalEnergyConsumed() {
		return sessionQueryService.getTotalEnergyConsumed();
	}

	public Long getActiveSessions() {
		return sessionQueryService.getActiveSessions();
	}

	public Double getAverageUptime() {
		return sessionQueryService.getAverageUptime();
	}

	public Optional<Session> findLastActiveSession() {
		return sessionQueryService.findLastActiveSession();
	}

	public Long getTodaysErrorCount() {
		return sessionQueryService.getTodaysErrorCount();
	}

	public List<Session> getallSessionRecords() {
		return sessionQueryService.getallSessionRecords();
	}

	public List<Map<String, Object>> getActiveSessionDetails() {
		return sessionQueryService.getActiveSessionDetails();
	}

	// ===================== PRIVATE HELPERS =====================

	private void scheduleAutoStop(Long sessionId, int durationMin) {
		scheduler.schedule(() -> {
			try {
				stopSessionBySystem(sessionId);
			} catch (Exception e) {
				log.error("Auto-stop scheduler error: sessionId={}: {}", sessionId, e.getMessage(), e);
			}
		}, durationMin, TimeUnit.MINUTES);
	}

	private void handleOfflineSession(Session session, Receipt receipt) {
		log.warn("Handling offline session failure for sessionId={}", session.getId());

		if (receipt.getAmount() != null && receipt.getAmount().compareTo(BigDecimal.ZERO) > 0) {
			walletTransactionService.credit(
					session.getUser().getId(),
					session.getId(),
					receipt.getAmount(),
					"Refund: Charger Offline");
			log.info("Refunded {} to user {} due to offline charger",
					receipt.getAmount(), session.getUser().getId());
		}

		userNotificationService.createNotification(
				session.getUser().getId(),
				"Charger Offline",
				"Cannot start charging - charger is offline. Amount refunded.",
				"ERROR");

		session.setStatus(SessionStatus.FAILED.getValue());
		session.setEndTime(LocalDateTime.now());
		sessionRepository.save(session);

		throw new ChargerOfflineException(session.getCharger().getId());
	}
}