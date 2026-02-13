create policy "supa_tenants_all"
on tenants for all
using (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999')
with check (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999');

create policy "supa_divisions_all"
on divisions for all
using (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999')
with check (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999');

create policy "supa_employees_all"
on employees for all
using (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999')
with check (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999');

create policy "supa_tenant_service_all"
on tenant_service for all
using (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999')
with check (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999');