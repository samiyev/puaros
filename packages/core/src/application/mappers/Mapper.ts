/**
 * Generic mapper interface for converting between domain entities and DTOs
 */
export interface IMapper<TDomain, TDto> {
    toDto(domain: TDomain): TDto;
    toDomain(dto: TDto): TDomain;
}

export abstract class Mapper<TDomain, TDto> implements IMapper<TDomain, TDto> {
    public abstract toDto(domain: TDomain): TDto;
    public abstract toDomain(dto: TDto): TDomain;

    public toDtoList(domains: TDomain[]): TDto[] {
        return domains.map((domain) => this.toDto(domain));
    }

    public toDomainList(dtos: TDto[]): TDomain[] {
        return dtos.map((dto) => this.toDomain(dto));
    }
}
