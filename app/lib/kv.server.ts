export class KVStore {
    private ns: KVNamespace

    constructor(namespace: KVNamespace) {
        this.ns = namespace
    }

    async put(key: string, value: string) {
        await this.ns.put(key, value)
    }

    async get(key: string) {
        const result = await this.ns.get(key)

        return result ?? undefined
    }

    async delete(key: string) {
        await this.ns.delete(key)
    }
}
