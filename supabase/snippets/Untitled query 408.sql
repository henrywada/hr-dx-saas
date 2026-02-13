create policy "supa_write_service_category"
on service_category for all
using (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999')
with check (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999');

create policy "supa_write_service"
on service for all
using (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999')
with check (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999');

create policy "supa_write_app_role"
on app_role for all
using (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999')
with check (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999');

create policy "supa_write_app_role_service"
on app_role_service for all
using (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999')
with check (auth.uid() = 'e97488f9-02be-4b0b-9dc9-ddb0c2902999');