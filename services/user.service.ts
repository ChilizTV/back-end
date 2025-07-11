import { User } from '../models';
import { UserSession } from '../models'; 
import { ServiceErrorCode, ServiceResult } from './service.result';

export class UserService {

    static async getUserFromSession(token: string): Promise<ServiceResult<User | undefined>> {
        try {
            const session = await UserSession.findOne({
                where: { token },
                include: [
                    {
                        model: User,
                        as: 'user',
                    }
                ]
            });

            if (session) {
                return ServiceResult.success(session?.user);
            }

            return ServiceResult.notFound();
        } catch (error) {
            return ServiceResult.failed();
        }
    }

}
