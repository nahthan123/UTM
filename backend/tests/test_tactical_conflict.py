"""
COMPREHENSIVE PYTEST SUITE FOR TASK 11 & TASK 12
Validates all 16 mandatory tactical deconfliction scenarios:
1. No conflict
2. Temporal separation (same location, different times)
3. Vertical separation (same location, sufficient altitude delta)
4. Converging trajectories (CPA breach)
5. 3-UAV cascading scenario
6. Secondary conflict prevention
7. Performance envelope violation rejection
8. Restricted Zone / NFZ violation rejection
9. Stale / lost data gating
10. Vertical speed absence & AGL vs MSL datum alignment
11. Operator approval & dispatch lifecycle
12. Operator rejection lifecycle
13. Simulator rejection lifecycle
14. Simulator timeout lifecycle
15. Post-adjustment telemetry verification (VERIFIED state)
16. AI scoring vs Baseline rule benchmark
"""

import pytest
import datetime
from backend.app.models.schemas import (
    ObservedUAVStatePayload,
    GeoPosition3D,
    VelocityVector3D,
    RestrictedZonePayload,
    ResolutionAdjustment
)
from backend.app.services.conflict_detection.detector import ConflictDetector
from backend.app.services.resolution.generator import ResolutionGenerator
from backend.app.services.resolution.validator import ResolutionValidator
from backend.app.services.resolution.ai_ranker import TacticalAIRanker
from backend.app.services.execution.state_machine import TacticalStateMachine
from backend.app.services.execution.mock_adapter import MockExecutionAdapter
from backend.app.services.spatial_math import haversine_distance_m, calculate_cpa

def make_uav(
    uav_id: str,
    lat: float,
    lon: float,
    alt_m: float,
    speed_mps: float,
    hdg_deg: float,
    v_speed_mps: float = None,
    alt_ref: str = 'AGL',
    freshness: str = 'FRESH',
    confidence: str = 'HIGH',
    uav_type: str = 'MULTIROTOR'
) -> ObservedUAVStatePayload:
    return ObservedUAVStatePayload(
        uav_id=uav_id,
        position=GeoPosition3D(
            latitude=lat,
            longitude=lon,
            altitude_m=alt_m,
            altitude_reference=alt_ref
        ),
        velocity=VelocityVector3D(
            ground_speed_mps=speed_mps,
            heading_deg=hdg_deg,
            vertical_speed_mps=v_speed_mps
        ),
        timestamp=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        freshness=freshness,
        confidence=confidence,
        uav_type=uav_type
    )

class TestTacticalDeconfliction:
    # 1. No conflict (nominal parallel/divergent flight)
    def test_01_no_conflict_parallel(self):
        detector = ConflictDetector(horizontal_threshold_m=50.0, vertical_threshold_m=15.0)
        u1 = make_uav("UAV-01", 16.0500, 108.2000, 100.0, 15.0, 90.0)
        u2 = make_uav("UAV-02", 16.0550, 108.2000, 100.0, 15.0, 90.0) # ~550m north

        conflicts = detector.detect_conflicts({"UAV-01": u1, "UAV-02": u2})
        assert len(conflicts) == 0

    # 2. Same location, different times (geometric crossing without temporal conflict)
    def test_02_geometric_crossing_temporal_separation(self):
        detector = ConflictDetector(horizontal_threshold_m=50.0, vertical_threshold_m=15.0, lookahead_window_s=60.0)
        # UAV-1 is 20m from intersection, moving at 10 m/s (crosses in 2s)
        # UAV-2 is 800m from intersection, moving at 10 m/s (crosses in 80s)
        u1 = make_uav("UAV-01", 16.0500, 108.2000, 100.0, 10.0, 0.0)
        u2 = make_uav("UAV-02", 16.0428, 108.2000, 100.0, 10.0, 0.0)

        conflicts = detector.detect_conflicts({"UAV-01": u1, "UAV-02": u2})
        # Time separation is > 60s, so no conflict in tactical window
        assert len(conflicts) == 0

    # 3. Same horizontal coordinates, but sufficient vertical separation
    def test_03_vertical_separation_safe(self):
        detector = ConflictDetector(horizontal_threshold_m=50.0, vertical_threshold_m=15.0)
        # Head-on collision horizontally, but 60m vertical separation (100m vs 160m)
        u1 = make_uav("UAV-01", 16.0500, 108.2000, 100.0, 10.0, 90.0)
        u2 = make_uav("UAV-02", 16.0500, 108.2050, 160.0, 10.0, 270.0)

        conflicts = detector.detect_conflicts({"UAV-01": u1, "UAV-02": u2})
        # CPA horizontal < 50m, but vertical distance is 60m >= 15m threshold -> SAFE
        assert len(conflicts) == 0

    # 4. Converging trajectories breaching horizontal and vertical thresholds (CPA conflict)
    def test_04_converging_conflict_detected(self):
        detector = ConflictDetector(horizontal_threshold_m=50.0, vertical_threshold_m=15.0)
        # Head-on, same altitude 120m, 300m apart, closing at 20 m/s
        u1 = make_uav("UAV-01", 16.0500, 108.2000, 120.0, 10.0, 90.0)
        u2 = make_uav("UAV-02", 16.0500, 108.2028, 120.0, 10.0, 270.0)

        conflicts = detector.detect_conflicts({"UAV-01": u1, "UAV-02": u2})
        assert len(conflicts) == 1
        c = conflicts[0]
        assert c.severity in ['CRITICAL', 'WARNING']
        assert c.cpa_horizontal_distance_m < 50.0
        assert c.cpa_vertical_distance_m < 15.0
        assert 10.0 <= c.time_to_cpa_seconds <= 20.0

    # 5. Multi-UAV cascading scenario (3 UAVs in tactical space)
    def test_05_three_uav_cascading_conflict(self):
        detector = ConflictDetector(horizontal_threshold_m=50.0, vertical_threshold_m=15.0)
        u1 = make_uav("UAV-01", 16.0500, 108.2000, 100.0, 10.0, 90.0)
        u2 = make_uav("UAV-02", 16.0500, 108.2020, 100.0, 10.0, 270.0) # Head-on with UAV-01
        u3 = make_uav("UAV-03", 16.0520, 108.2010, 100.0, 10.0, 180.0) # Crossing from North

        conflicts = detector.detect_conflicts({"UAV-01": u1, "UAV-02": u2, "UAV-03": u3})
        assert len(conflicts) >= 1
        uav_ids_in_conflict = set()
        for c in conflicts:
            uav_ids_in_conflict.add(c.uav_a_id)
            uav_ids_in_conflict.add(c.uav_b_id)
        assert len(uav_ids_in_conflict) >= 2

    # 6. Secondary conflict prevention (Resolution avoids UAV-2 but hits UAV-3)
    def test_06_secondary_conflict_detected_and_rejected(self):
        validator = ResolutionValidator(min_horizontal_separation_m=50.0, min_vertical_separation_m=15.0)
        u1 = make_uav("UAV-01", 16.0500, 108.2000, 100.0, 10.0, 90.0)
        u2 = make_uav("UAV-02", 16.0500, 108.2025, 100.0, 10.0, 270.0) # Primary conflict
        # UAV-03 is flying at 130m right above the conflict area
        u3 = make_uav("UAV-03", 16.0500, 108.2012, 130.0, 0.0, 0.0)

        # Propose climbing UAV-01 to 130m (+30m): this resolves conflict with UAV-02 but causes collision with UAV-03!
        climb_adj = ResolutionAdjustment(action_type='ALTITUDE_CHANGE', target_altitude_m=130.0, altitude_delta_m=30.0)
        check = validator.validate_resolution(
            target_uav=u1,
            other_uav_states={"UAV-02": u2, "UAV-03": u3},
            primary_conflicting_uav_id="UAV-02",
            adjustment=climb_adj,
            projected_trajectory=[]
        )
        assert check.causes_secondary_conflict is True
        assert check.is_feasible is False
        assert any("xung đột thứ cấp" in r for r in check.rejection_reasons)

    # 7. Performance envelope violation rejection (e.g. Fixed-wing below stall or climb too fast)
    def test_07_performance_envelope_violation(self):
        validator = ResolutionValidator()
        # Fixed wing UAV with stall speed 12 m/s
        fw = make_uav("UAV-FW", 16.0500, 108.2000, 100.0, 20.0, 90.0, uav_type='FIXED_WING')
        other = make_uav("UAV-02", 16.0500, 108.2030, 100.0, 15.0, 270.0)

        # Propose slowing down to 5 m/s (below 12 m/s stall limit!)
        slow_adj = ResolutionAdjustment(action_type='SPEED_CHANGE', target_ground_speed_mps=5.0, speed_delta_mps=-15.0)
        check = validator.validate_resolution(
            target_uav=fw,
            other_uav_states={"UAV-02": other},
            primary_conflicting_uav_id="UAV-02",
            adjustment=slow_adj,
            projected_trajectory=[]
        )
        assert check.within_performance_envelope is False
        assert check.is_feasible is False
        assert any("stall" in r.lower() or "tối thiểu" in r for r in check.rejection_reasons)

    # 8. Restricted Zone / NFZ violation rejection
    def test_08_nfz_violation_rejection(self):
        generator = ResolutionGenerator()
        u1 = make_uav("UAV-01", 16.0500, 108.2000, 100.0, 10.0, 90.0)
        u2 = make_uav("UAV-02", 16.0500, 108.2030, 100.0, 10.0, 270.0)

        detector = ConflictDetector()
        conflicts = detector.detect_conflicts({"UAV-01": u1, "UAV-02": u2})
        assert len(conflicts) == 1

        # Place a restricted zone at 140m altitude
        nfz = RestrictedZonePayload(
            zone_id="NFZ-TEST-01",
            name="Vùng cấm bay thử nghiệm",
            type="NO_FLY_ZONE",
            min_altitude_m=120.0,
            max_altitude_m=200.0,
            polygon=[
                [108.199, 16.049],
                [108.205, 16.049],
                [108.205, 16.052],
                [108.199, 16.052]
            ]
        )

        options = generator.generate_options(conflicts[0], {"UAV-01": u1, "UAV-02": u2}, restricted_zones=[nfz])
        # Altitude climb into 120-200m range must be rejected
        climb_opts = [o for o in options if o.adjustment.action_type == 'ALTITUDE_CHANGE' and (o.adjustment.target_altitude_m or 0) >= 120.0]
        for opt in climb_opts:
            assert opt.constraint_check.breaches_restricted_zone is True
            assert opt.constraint_check.is_feasible is False

    # 9. Stale / lost data gating
    def test_09_stale_data_gating(self):
        detector = ConflictDetector()
        u1 = make_uav("UAV-01", 16.0500, 108.2000, 100.0, 10.0, 90.0, freshness='LOST')
        u2 = make_uav("UAV-02", 16.0500, 108.2025, 100.0, 10.0, 270.0)

        # Link lost -> cannot project physical trajectory with confidence
        conflicts = detector.detect_conflicts({"UAV-01": u1, "UAV-02": u2})
        assert len(conflicts) == 0

    # 10. Missing vertical speed & AGL vs MSL datum alignment
    def test_10_altitude_datum_alignment_flag(self):
        detector = ConflictDetector()
        # u1 is AGL datum, u2 is MSL datum
        u1 = make_uav("UAV-01", 16.0500, 108.2000, 120.0, 10.0, 90.0, v_speed_mps=None, alt_ref='AGL')
        u2 = make_uav("UAV-02", 16.0500, 108.2025, 120.0, 10.0, 270.0, v_speed_mps=None, alt_ref='MSL')

        conflicts = detector.detect_conflicts({"UAV-01": u1, "UAV-02": u2})
        assert len(conflicts) == 1
        assert conflicts[0].requires_altitude_alignment is True
        assert "AGL vs MSL" in conflicts[0].description

    # 11. Operator approval & dispatch lifecycle
    def test_11_operator_approval_lifecycle(self):
        detector = ConflictDetector()
        generator = ResolutionGenerator()
        mock_adapter = MockExecutionAdapter(should_succeed=True)
        sm = TacticalStateMachine(execution_adapter=mock_adapter)

        u1 = make_uav("UAV-01", 16.0500, 108.2000, 100.0, 10.0, 90.0)
        u2 = make_uav("UAV-02", 16.0500, 108.2030, 100.0, 10.0, 270.0)
        conflicts = detector.detect_conflicts({"UAV-01": u1, "UAV-02": u2})
        options = generator.generate_options(conflicts[0], {"UAV-01": u1, "UAV-02": u2})

        session = sm.create_session(conflicts[0], options)
        assert session.lifecycle_state == 'PENDING_APPROVAL'

        feasible_opt = next(o for o in options if o.status == 'FEASIBLE')
        approved_session = sm.approve_option(session.session_id, feasible_opt.option_id, "TEST-OPERATOR")

        assert approved_session.lifecycle_state == 'EXECUTING'
        assert approved_session.approved_by == "TEST-OPERATOR"
        assert approved_session.command_ack_status == 'ACCEPTED'

    # 12. Operator rejection lifecycle
    def test_12_operator_rejection_lifecycle(self):
        detector = ConflictDetector()
        generator = ResolutionGenerator()
        sm = TacticalStateMachine()

        u1 = make_uav("UAV-01", 16.0500, 108.2000, 100.0, 10.0, 90.0)
        u2 = make_uav("UAV-02", 16.0500, 108.2030, 100.0, 10.0, 270.0)
        conflicts = detector.detect_conflicts({"UAV-01": u1, "UAV-02": u2})
        options = generator.generate_options(conflicts[0], {"UAV-01": u1, "UAV-02": u2})

        session = sm.create_session(conflicts[0], options)
        rejected = sm.reject_option(session.session_id, "Phi công báo kiểm soát thủ công")
        assert rejected.lifecycle_state == 'REJECTED'

    # 13. Simulator rejection lifecycle
    def test_13_simulator_rejection_lifecycle(self):
        detector = ConflictDetector()
        generator = ResolutionGenerator()
        # Mock adapter configured to fail
        failing_adapter = MockExecutionAdapter(should_succeed=False)
        sm = TacticalStateMachine(execution_adapter=failing_adapter)

        u1 = make_uav("UAV-01", 16.0500, 108.2000, 100.0, 10.0, 90.0)
        u2 = make_uav("UAV-02", 16.0500, 108.2030, 100.0, 10.0, 270.0)
        conflicts = detector.detect_conflicts({"UAV-01": u1, "UAV-02": u2})
        options = generator.generate_options(conflicts[0], {"UAV-01": u1, "UAV-02": u2})

        session = sm.create_session(conflicts[0], options)
        feasible_opt = next(o for o in options if o.status == 'FEASIBLE')
        failed_session = sm.approve_option(session.session_id, feasible_opt.option_id)

        assert failed_session.lifecycle_state == 'FAILED'
        assert failed_session.command_ack_status == 'REJECTED'

    # 14. Simulator timeout lifecycle
    def test_14_simulator_timeout_lifecycle(self):
        # Create a mock adapter that returns None status (timeout)
        class TimeoutAdapter(MockExecutionAdapter):
            def dispatch_command(self, *args, **kwargs):
                return {'status': 'TIMEOUT'}

        detector = ConflictDetector()
        generator = ResolutionGenerator()
        sm = TacticalStateMachine(execution_adapter=TimeoutAdapter())

        u1 = make_uav("UAV-01", 16.0500, 108.2000, 100.0, 10.0, 90.0)
        u2 = make_uav("UAV-02", 16.0500, 108.2030, 100.0, 10.0, 270.0)
        conflicts = detector.detect_conflicts({"UAV-01": u1, "UAV-02": u2})
        options = generator.generate_options(conflicts[0], {"UAV-01": u1, "UAV-02": u2})

        session = sm.create_session(conflicts[0], options)
        feasible_opt = next(o for o in options if o.status == 'FEASIBLE')
        timeout_session = sm.approve_option(session.session_id, feasible_opt.option_id)

        assert timeout_session.lifecycle_state == 'TIMEOUT'

    # 15. Post-adjustment telemetry verification (VERIFIED state)
    def test_15_verification_with_new_telemetry(self):
        mock_adapter = MockExecutionAdapter(should_succeed=True)
        sm = TacticalStateMachine(execution_adapter=mock_adapter)

        u1 = make_uav("UAV-01", 16.0500, 108.2000, 100.0, 10.0, 90.0)
        u2 = make_uav("UAV-02", 16.0500, 108.2030, 100.0, 10.0, 270.0)
        detector = ConflictDetector()
        generator = ResolutionGenerator()
        conflicts = detector.detect_conflicts({"UAV-01": u1, "UAV-02": u2})
        options = generator.generate_options(conflicts[0], {"UAV-01": u1, "UAV-02": u2})

        session = sm.create_session(conflicts[0], options)
        feasible_opt = next(o for o in options if o.status == 'FEASIBLE')
        sm.approve_option(session.session_id, feasible_opt.option_id)
        assert session.lifecycle_state == 'EXECUTING'

        # New telemetry arrives: UAV-01 climbed to 135m (+35m altitude separation)
        u1_new = make_uav("UAV-01", 16.0500, 108.2015, 135.0, 10.0, 90.0)
        u2_new = make_uav("UAV-02", 16.0500, 108.2015, 100.0, 10.0, 270.0)

        verified_session = sm.verify_resolution_with_new_telemetry(
            session.session_id,
            {"UAV-01": u1_new, "UAV-02": u2_new}
        )
        assert verified_session.lifecycle_state == 'VERIFIED'
        assert verified_session.verification_status == 'CONFIRMED_SAFE'
        assert "xác minh qua telemetry mới" in verified_session.verification_details.lower()

    # 16. Tier B AI ranking vs Tier A baseline rule ranking benchmark
    def test_16_ai_vs_baseline_ranking_benchmark(self):
        u1 = make_uav("UAV-01", 16.0500, 108.2000, 100.0, 10.0, 90.0, uav_type='MULTIROTOR')
        u2 = make_uav("UAV-02", 16.0500, 108.2030, 100.0, 10.0, 270.0)
        detector = ConflictDetector()
        generator = ResolutionGenerator()
        conflicts = detector.detect_conflicts({"UAV-01": u1, "UAV-02": u2})

        # Generate options with AI
        ai_options = generator.generate_options(conflicts[0], {"UAV-01": u1, "UAV-02": u2}, use_ai=True)
        # Generate options with Baseline
        baseline_options = generator.generate_options(conflicts[0], {"UAV-01": u1, "UAV-02": u2}, use_ai=False)

        assert len(ai_options) > 0
        assert len(baseline_options) > 0

        # AI options contain feature attribution rationale
        top_ai = ai_options[0]
        assert "[AI Assisted]" in top_ai.selection_rationale
        assert top_ai.ai_confidence_score is not None

        # Baseline options contain rule rationale
        top_base = baseline_options[0]
        assert "[Quy tắc cơ sở]" in top_base.selection_rationale
