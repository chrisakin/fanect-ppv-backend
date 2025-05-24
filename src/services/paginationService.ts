import { Model, PipelineStage } from 'mongoose';

interface PaginationOptions {
    page?: number;
    limit?: number;
}

interface PaginationResult<T> {
    docs: T[];
    totalDocs: number;
    totalPages: number;
    currentPage: number;
    nextPage: number | null;
    previousPage: number | null;
    limit: number;
}

export async function paginateFind<T>(
    model: Model<T>,
    query: any,
    options: PaginationOptions = {},
    projection: any = {},
    sort: any = {}
): Promise<PaginationResult<T>> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Number(options.limit) || 10);

    const [docs, totalDocs] = await Promise.all([
        model.find(query, projection).sort(sort).skip((page - 1) * limit).limit(limit),
        model.countDocuments(query)
    ]);

    const totalPages = Math.ceil(totalDocs / limit);

    return {
        docs,
        totalDocs,
        totalPages,
        currentPage: page,
        nextPage: page < totalPages ? page + 1 : null,
        previousPage: page > 1 ? page - 1 : null,
        limit
    };
}

export async function paginateAggregate<T>(
    model: Model<T>,
    pipeline: PipelineStage[],
    options: PaginationOptions = {}
): Promise<PaginationResult<T>> {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.max(1, Number(options.limit) || 10);

    // Clone pipeline for count
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await model.aggregate(countPipeline);
    const totalDocs = countResult[0]?.total || 0;
    const totalPages = Math.ceil(totalDocs / limit);

    // Add pagination stages
    const paginatedPipeline = [
        ...pipeline,
        { $skip: (page - 1) * limit },
        { $limit: limit }
    ];
    const docs = await model.aggregate(paginatedPipeline);

    return {
        docs,
        totalDocs,
        totalPages,
        currentPage: page,
        nextPage: page < totalPages ? page + 1 : null,
        previousPage: page > 1 ? page - 1 : null,
        limit
    };
}