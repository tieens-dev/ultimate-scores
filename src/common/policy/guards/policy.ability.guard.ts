import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'

import { IRequestApp } from '@common/request/interfaces/request.interface'
import { ENUM_POLICY_STATUS_CODE_ERROR } from '@common/policy/constants/policy.status-code.constant'
import { ENUM_POLICY_ROLE_TYPE } from '@common/policy/constants/policy.enum.constant'
import { POLICY_ABILITY_META_KEY } from '@common/policy/constants/policy.constant'
import {
  IPolicyAbility,
  IPolicyAbilityHandlerCallback
} from '@common/policy/interfaces/policy.interface'
import { PolicyAbilityFactory } from '@common/policy/factories/policy.factory'

@Injectable()
export class PolicyAbilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly policyAbilityFactory: PolicyAbilityFactory
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const policy =
      this.reflector.get<IPolicyAbility[]>(
        POLICY_ABILITY_META_KEY,
        context.getHandler()
      ) || []

    const { user } = context.switchToHttp().getRequest<IRequestApp>()
    const { permissions, type } = user

    if (type === ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN) {
      return true
    }

    const ability = this.policyAbilityFactory.defineFromRequest(permissions)

    const policyHandler: IPolicyAbilityHandlerCallback[] =
      this.policyAbilityFactory.handlerAbilities(policy)
    const check: boolean = policyHandler.every(
      (handler: IPolicyAbilityHandlerCallback) => {
        return handler(ability)
      }
    )

    if (!check) {
      throw new ForbiddenException({
        statusCode: ENUM_POLICY_STATUS_CODE_ERROR.ABILITY_FORBIDDEN_ERROR,
        message: 'policy.error.abilityForbidden'
      })
    }

    return true
  }
}
