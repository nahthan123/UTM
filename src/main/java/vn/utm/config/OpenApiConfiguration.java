package vn.utm.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfiguration {
    @Bean
    public OpenAPI utmOpenApi() {
        return new OpenAPI()
                .info(new Info().title("SkyPermit UTM API").version("0.1.0")
                        .description("API quản lý người vận hành, UAV, kế hoạch bay và bàn giao mock. "
                                + "Để thử API, thực hiện POST /api/auth/login hoặc /api/auth/register bằng Try it out trước. "
                                + "Trình duyệt tự gửi cookie phiên JSESSIONID cho các yêu cầu tiếp theo trên cùng địa chỉ. "
                                + "Không cần nhập token hoặc cookie vào nút Authorize. "
                                + "Chỉ ADMIN duyệt/từ chối kế hoạch; MANAGER điều hành kế hoạch đã duyệt. "
                                + "Thời gian API trả UTC; thời gian không có offset được hiểu là UTC+7. "
                                + "Các thao tác Try it out thay đổi dữ liệu của database ứng dụng đang kết nối."))
                .components(new Components().addSecuritySchemes("sessionCookie", new SecurityScheme()
                        .type(SecurityScheme.Type.APIKEY).in(SecurityScheme.In.COOKIE).name("JSESSIONID")
                        .description("Phiên do endpoint đăng nhập/đăng ký tạo. Dùng cookie tự động của trình duyệt cùng origin.")))
                .addSecurityItem(new SecurityRequirement().addList("sessionCookie"));
    }
}
