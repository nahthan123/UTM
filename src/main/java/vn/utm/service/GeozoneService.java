package vn.utm.service;

import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import vn.utm.dto.request.GeozoneRequest;
import vn.utm.dto.response.PageResponse;
import vn.utm.model.*;
import vn.utm.repository.*;

@Service
@Transactional
public class GeozoneService {
    private static final Set<String> TYPES = Set.of("NFZ", "RESTRICTED", "TFR_UVR");
    private static final Set<String> CATEGORIES = Set.of("STATIC", "DYNAMIC");

    private final GeozoneRepository geozones;
    private final SystemLogRepository logs;
    private final AuthService auth;

    public GeozoneService(GeozoneRepository geozones, SystemLogRepository logs, AuthService auth) {
        this.geozones = geozones;
        this.logs = logs;
        this.auth = auth;
    }

    @Transactional(readOnly = true)
    public PageResponse<Geozone> list(Map<String, String> params, UserAccount actor) {
        int page = Integer.parseInt(params.getOrDefault("page", "0"));
        int size = Integer.parseInt(params.getOrDefault("size", "10"));
        if (page < 0 || size < 1 || size > 100) throw new IllegalArgumentException("page >= 0, size từ 1 đến 100");
        boolean enabled = !params.containsKey("isActive") || parseBool(params.get("isActive"), "isActive");
        String[] sort = params.getOrDefault("sort", "created_at,desc").split(",", -1);
        String field = switch (sort[0]) {
            case "created_at" -> "createdAt";
            case "updated_at" -> "updatedAt";
            default -> sort[0];
        };
        if (!Set.of("createdAt", "updatedAt", "code", "name").contains(field) || sort.length > 2)
            throw new IllegalArgumentException("Trường sắp xếp không hợp lệ");
        Sort.Direction direction = sort.length == 2 ? Sort.Direction.fromString(sort[1]) : Sort.Direction.ASC;
        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, field).and(Sort.by("id")));

        Specification<Geozone> spec = (root, query, cb) -> enabled
                ? cb.and(cb.isTrue(root.get("active")), cb.isNull(root.get("deletedAt")))
                : cb.isFalse(root.get("active"));

        String zoneType = params.get("zoneType");
        if (zoneType != null && !zoneType.isBlank()) {
            String upper = zoneType.trim().toUpperCase(Locale.ROOT);
            spec = spec.and((root, query, cb) -> cb.equal(root.get("zoneType"), upper));
        }
        String category = params.get("category");
        if (category != null && !category.isBlank()) {
            String upper = category.trim().toUpperCase(Locale.ROOT);
            spec = spec.and((root, query, cb) -> cb.equal(root.get("category"), upper));
        }
        String keyword = params.get("keyword");
        if (keyword != null && !keyword.isBlank()) {
            String like = "%" + keyword.trim().toLowerCase(Locale.ROOT) + "%";
            spec = spec.and((root, query, cb) -> cb.or(
                    cb.like(cb.lower(root.get("code")), like),
                    cb.like(cb.lower(root.get("name")), like)));
        }
        return PageResponse.from(geozones.findAll(spec, pageable));
    }

    @Transactional(readOnly = true)
    public Geozone get(UUID id) {
        return geozones.findById(id).orElseThrow(() -> new NoSuchElementException("Không tìm thấy vùng cấm/hạn chế bay"));
    }

    public Geozone save(UUID id, GeozoneRequest request, UserAccount actor) {
        auth.requireManager(actor);
        String code = request.code().trim().toUpperCase(Locale.ROOT);
        String name = request.name().trim();
        String zoneType = request.zoneType().trim().toUpperCase(Locale.ROOT);
        String category = request.category().trim().toUpperCase(Locale.ROOT);
        if (!TYPES.contains(zoneType)) throw new IllegalArgumentException("Loại vùng chỉ hỗ trợ NFZ, RESTRICTED hoặc TFR_UVR");
        if (!CATEGORIES.contains(category)) throw new IllegalArgumentException("Phân loại chỉ hỗ trợ STATIC hoặc DYNAMIC");
        if (geozones.findByCodeIgnoreCase(code).filter(z -> !z.getId().equals(id)).isPresent())
            throw new IllegalArgumentException("Mã vùng cấm/hạn chế đã tồn tại");

        double lat = request.centerLat();
        double lng = request.centerLng();
        double radius = request.radiusMeters();
        double minAlt = request.minAltitudeM() == null ? 0.0 : request.minAltitudeM();
        double maxAlt = request.maxAltitudeM() == null ? 120.0 : request.maxAltitudeM();
        if (!Double.isFinite(lat) || Math.abs(lat) > 90 || !Double.isFinite(lng) || Math.abs(lng) > 180)
            throw new IllegalArgumentException("Tọa độ tâm vùng không hợp lệ");
        if (!Double.isFinite(radius) || radius <= 0 || radius > 50000)
            throw new IllegalArgumentException("Bán kính phải từ > 0 đến 50000 m");
        if (!Double.isFinite(minAlt) || !Double.isFinite(maxAlt) || minAlt < 0 || maxAlt < minAlt)
            throw new IllegalArgumentException("Khoảng độ cao vùng không hợp lệ");
        if (request.effectiveFrom() != null && request.effectiveTo() != null
                && !request.effectiveTo().isAfter(request.effectiveFrom()))
            throw new IllegalArgumentException("Thời gian kết thúc hiệu lực phải sau thời gian bắt đầu");

        Geozone zone = id == null ? new Geozone() : get(id);
        if (id != null && (!zone.isActive() || zone.getDeletedAt() != null))
            throw new NoSuchElementException("Vùng đã ngừng hiệu lực");
        zone.setCode(code);
        zone.setName(name);
        zone.setZoneType(zoneType);
        zone.setCategory(category);
        zone.setCenterLat(lat);
        zone.setCenterLng(lng);
        zone.setRadiusMeters(radius);
        zone.setMinAltitudeM(minAlt);
        zone.setMaxAltitudeM(maxAlt);
        zone.setEffectiveFrom(request.effectiveFrom());
        zone.setEffectiveTo(request.effectiveTo());
        zone.setDescription(request.description() == null || request.description().isBlank() ? null : request.description().trim());
        zone.recordActor(actor.getId());
        geozones.save(zone);
        log(actor, "GEOZONE_SAVE", zone.getCode() + ":" + zone.getZoneType());
        return zone;
    }

    public Geozone changeActive(UUID id, boolean restore, UserAccount actor) {
        auth.requireManager(actor);
        Geozone zone = get(id);
        if (restore) {
            zone.restore(actor.getId());
        } else {
            if (!zone.isActive() || zone.getDeletedAt() != null) throw new NoSuchElementException("Vùng không còn hoạt động");
            zone.softDelete(actor.getId());
        }
        log(actor, restore ? "GEOZONE_RESTORE" : "GEOZONE_DELETE", zone.getCode());
        return zone;
    }

    private boolean parseBool(String value, String name) {
        if (!Set.of("true", "false").contains(value)) throw new IllegalArgumentException(name + " phải là true/false");
        return Boolean.parseBoolean(value);
    }

    private void log(UserAccount actor, String action, String details) {
        SystemLog entry = new SystemLog();
        entry.setUser(actor);
        entry.setActionType(action);
        entry.setDetails(details);
        entry.recordActor(actor.getId());
        logs.save(entry);
    }
}
