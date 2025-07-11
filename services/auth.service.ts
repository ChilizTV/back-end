import { SecurityUtils } from "../utils/crypto";
import { User, UserSession } from "../models";
import { ServiceResult } from "./service.result";

export class AuthService {

    static async login(login: string, password: string): Promise<{ sessionToken: string }> {
        try {
            const user = await User.findOne({
                where: { email: login, pw: password },
            });

            if (!user) {
                throw new Error("Invalid login or password");
            }

            const sessionToken = SecurityUtils.randomToken();

            // (30 minutes plus tard)
            const expirationDate = new Date(Date.now() + 1800000);

            await UserSession.create({
                token: sessionToken,
                expirationDate,
                fk_user_id: user.id,
            });

            return { sessionToken };
        } catch (error) {
            console.error("Login failed:", error);
            throw new Error("Login failed. Please try again.");
        }
    }

    static async getSession(token: string): Promise<ServiceResult<UserSession>> {
        try {
            const session = await UserSession.findOne({
                where: {
                    token,
                    expirationDate: { $gt: new Date() },
                },
                include: [
                    {
                        model: User,
                        as: "user",
                    },
                ],
            });

            if (!session) {
                return ServiceResult.notFound();
            }

            return ServiceResult.success(session);
        } catch (error) {
            console.error("Get session failed:", error);
            return ServiceResult.failed();
        }
    }
}

export default new AuthService();
