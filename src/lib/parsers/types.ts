export type ParserEngine =
    | 'rpgmaker'
    | 'unity'
    | 'renpy'
    | 'unreal'
    | 'palworld'
    | 'gamemaker'
    | 'naninovel';

export type RoundTripSupportLevel = 'stable' | 'experimental' | 'none';

export type FailureReasonCode =
    | 'ok'
    | 'parse_failed'
    | 'unsupported_extension'
    | 'unsupported_binary'
    | 'unsupported_binary_plist'
    | 'unsupported_binary_playerprefs'
    | 'unsupported_ruby_marshal'
    | 'raw_fallback'
    | 'unsupported_container'
    | 'encrypted_or_unsupported_container'
    | 'unsupported_naninovel_wrapper'
    | 'likely_encrypted_container'
    | 'restricted_write_scope'
    | 'world_file_limited'
    | 'standard_gvas'
    | 'compressed_repackable'
    | 'compressed_readonly'
    | 'gvas_parse_failed'
    | 'decompression_limit'
    | 'decompression_failed'
    | 'not_gvas';

export interface ParserCapability {
    canView: boolean;
    canEdit: boolean;
    canSave: boolean;
    requiresExperimental: boolean;
    roundTripSupport: RoundTripSupportLevel;
}

export interface ParseOutcome<TData = unknown> {
    engine: ParserEngine;
    format: string;
    mode: string;
    reasonCode: FailureReasonCode | string;
    reason?: string;
    capabilities: ParserCapability;
    data: TData;
    warnings?: string[];
    diagnostics?: Record<string, unknown>;
}

export function makeCapabilities(input: Partial<ParserCapability>): ParserCapability {
    return {
        canView: input.canView ?? false,
        canEdit: input.canEdit ?? false,
        canSave: input.canSave ?? false,
        requiresExperimental: input.requiresExperimental ?? false,
        roundTripSupport: input.roundTripSupport ?? 'none',
    };
}

export function makeOutcome<TData>(
    outcome: Omit<ParseOutcome<TData>, 'capabilities'> & { capabilities?: Partial<ParserCapability> }
): ParseOutcome<TData> {
    return {
        ...outcome,
        capabilities: makeCapabilities(outcome.capabilities || {}),
    };
}
