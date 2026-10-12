package com.bentork.ev_system.service;

import com.bentork.ev_system.model.*;
import com.bentork.ev_system.repository.*;
import com.bentork.ev_system.enums.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import java.util.UUID;

@SpringBootTest
public class PurchaseOrderSaveTest {

    @Autowired
    private PurchaseOrderRepository poRepo;

    @Autowired
    private VendorRepository vendorRepo;

    @Autowired
    private ProductRepository productRepo;

    @Test
    public void testSave() {
        Vendor v = new Vendor();
        v.setName("Test Vendor");
        v.setActive(true);
        v = vendorRepo.save(v);

        Product p = new Product();
        p.setName("Test Product");
        p.setActive(true);
        p = productRepo.save(p);

        PurchaseOrder po = new PurchaseOrder();
        po.setPoNumber("PO-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        po.setVendor(v);
        po.setStatus(PurchaseOrderStatus.DRAFT);

        PurchaseOrderItem item = new PurchaseOrderItem();
        item.setPurchaseOrder(po);
        item.setProduct(p);
        item.setQuantity(10);
        po.getOrderItems().add(item);

        poRepo.save(po);
    }
}
