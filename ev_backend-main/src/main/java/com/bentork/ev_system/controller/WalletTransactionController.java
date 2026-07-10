package com.bentork.ev_system.controller;

import lombok.RequiredArgsConstructor;

import java.util.List;

import com.bentork.ev_system.model.WalletTransaction;
import com.bentork.ev_system.service.interfaces.IWalletTransactionService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/wallet")
public class WalletTransactionController {
    private final IWalletTransactionService walletService;
    
    @GetMapping("/history/{userId}")
    public ResponseEntity<List<WalletTransaction>> getWalletHistory(
            @PathVariable Long userId,
            @RequestParam(value = "type", required = false) String type,
            @RequestParam(value = "viewAll", defaultValue = "false") boolean viewAll) {

        List<WalletTransaction> history = walletService.getTransactionHistory(userId, type, viewAll);
        return ResponseEntity.ok(history);
    }
}